import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getOpenAI } from "@/lib/openai"
import sharp from "sharp"

export const maxDuration = 120

const CATEGORY_LABELS: Record<string, string> = {
  "product-design":       "Product Design",
  "digital-marketing":    "Digital Marketing",
  "branding-design":      "Branding & Design",
  "user-research":        "User Research",
  "data-and-ai-literacy": "Data & AI Literacy",
}

const LEVEL_LABELS: Record<string, string> = {
  basic:        "Beginner",
  intermediate: "Intermediate",
  advanced:     "Advanced",
}

const COURSE_JSON_SCHEMA = {
  name: "course",
  strict: true,
  schema: {
    type: "object",
    properties: {
      course_name:  { type: "string", description: "Clear, engaging course title" },
      description:  { type: "string", description: "Short 1–2 sentence course description shown to students" },
      tags:         { type: "array", items: { type: "string" }, description: "3–6 relevant keyword tags" },
      time_to_read: { type: "number", description: "Estimated total study time in minutes" },
      objectives: {
        type: "array",
        description: "3–5 learning outcomes (what the student will be able to do)",
        items: { type: "string" },
      },
      items: {
        type: "array",
        description: "Ordered sequence of content lessons and quizzes, interleaved: content, quiz, content, quiz, …",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["content", "quiz"],
              description: "content for a lesson, quiz for a quiz",
            },
            title:      { type: "string", description: "Lesson title, or quiz title (e.g. 'Quiz: Foundations')" },
            paragraph1: { type: "string", description: "Main lesson content (3–5 sentences). Empty string for quiz items." },
            paragraph2: { type: "string", description: "Supporting content or examples. Empty string for quiz items." },
            callout:    { type: "string", description: "A key insight to highlight (1 sentence). Empty string for quiz items." },
            questions: {
              type: "array",
              description: "Quiz questions (3–5 items for quiz type; empty array for content type)",
              items: {
                type: "object",
                properties: {
                  question:      { type: "string" },
                  options:       { type: "array", items: { type: "string" } },
                  correct_index: { type: "number", description: "0-based index of the correct option" },
                  explanation:   { type: "string", description: "Brief explanation of why the answer is correct" },
                },
                required: ["question", "options", "correct_index", "explanation"],
                additionalProperties: false,
              },
            },
          },
          required: ["type", "title", "paragraph1", "paragraph2", "callout", "questions"],
          additionalProperties: false,
        },
      },
    },
    required: ["course_name", "description", "tags", "time_to_read", "objectives", "items"],
    additionalProperties: false,
  },
}

export async function POST(req: NextRequest) {
  try {
    const { bookIds, category, level, additionalInstructions, generateImage, imagePrompt } = await req.json() as {
      bookIds: string[]
      category: string
      level: string
      additionalInstructions?: string
      generateImage?: boolean
      imagePrompt?: string
    }

    if (!bookIds?.length || !category || !level) {
      return NextResponse.json({ error: "bookIds, category and level are required" }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: books, error: bErr } = await supabase
      .from("ai_books")
      .select("title, author, extracted_text")
      .in("id", bookIds)

    if (bErr || !books?.length) {
      return NextResponse.json({ error: "Books not found" }, { status: 404 })
    }

    // Trim book text to fit context — ~80K chars total across all books
    const MAX_CHARS = 80_000
    const perBook = Math.floor(MAX_CHARS / books.length)
    const bookContext = books
      .map((b: { title: string; author: string | null; extracted_text: string }, i: number) => {
        const text = b.extracted_text.slice(0, perBook)
        return `=== BOOK ${i + 1}: "${b.title}"${b.author ? ` by ${b.author}` : ""} ===\n${text}`
      })
      .join("\n\n")

    const categoryLabel = CATEGORY_LABELS[category] ?? category
    const levelLabel    = LEVEL_LABELS[level] ?? level

    const systemPrompt = `You are an expert curriculum designer creating online courses for Mishka, a professional learning platform.

You will be given content from one or more books and must design a single, well-structured course based on that material.

Rules:
- The course must be grounded in the provided book content — do not fabricate facts
- Write in a clear, engaging, professional tone suitable for working professionals
- Lessons must be substantive: paragraph1 should be 3–5 sentences of real educational content
- Every quiz question must be answerable from the lesson content
- Do not include any markdown formatting (no **, no #, no -)
- Return ONLY the JSON object

STRUCTURE:
The items array must alternate: content lesson, then quiz, content lesson, then quiz, and so on.
For CONTENT items: type="content", fill paragraph1/paragraph2/callout, questions=[]
For QUIZ items: type="quiz", paragraph1="", paragraph2="", callout="", fill questions with 3–5 multiple-choice questions (4 options each, correct_index set)`

    const resolvedInstructions = (additionalInstructions ?? "")
      .replace(/\{COURSE_NAME\}/g, "the course derived from the provided book content")
      .replace(/\{LEVEL\}/g, levelLabel)
      .replace(/\{CATEGORY\}/g, categoryLabel)
      .trim()

    const userPrompt = `Create a ${levelLabel}-level ${categoryLabel} course based on the following book content.
${resolvedInstructions ? `\nAdditional instructions: ${resolvedInstructions}\n` : ""}
Generate 6–10 content lessons, each immediately followed by a quiz. The items array must interleave them: content, quiz, content, quiz, …

BOOK CONTENT:
${bookContext}`

    const response = await getOpenAI().responses.create({
      model: "gpt-4o",
      instructions: systemPrompt,
      input: userPrompt,
      text: {
        format: {
          type: "json_schema",
          name: COURSE_JSON_SCHEMA.name,
          strict: COURSE_JSON_SCHEMA.strict,
          schema: COURSE_JSON_SCHEMA.schema,
        },
      },
      max_output_tokens: 16000,
    })

    const raw = response.output_text
    if (!raw) return NextResponse.json({ error: "No response from OpenAI" }, { status: 500 })

    const course = JSON.parse(raw)

    // Optional: generate thumbnail with DALL·E 3
    let thumbnailUrl: string | null = null
    if (generateImage) {
      const resolvedImagePrompt = (imagePrompt ?? "")
        .replace(/\{COURSE_NAME\}/g, course.course_name ?? "")
        .replace(/\{COURSE_SUMMARY\}/g, course.description ?? "")
        .trim()
      const prompt = resolvedImagePrompt
        ? resolvedImagePrompt
        : `Professional course thumbnail for a ${levelLabel}-level ${categoryLabel} online course titled "${course.course_name}". Clean, modern, abstract illustration. Square format, no text.`

      const imgResponse = await getOpenAI().images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
      })

      const b64 = imgResponse.data?.[0]?.b64_json
      if (b64) {
        try {
          const webpBuffer = await sharp(Buffer.from(b64, "base64")).webp({ quality: 82 }).toBuffer()
          const storagePath = `images/ai-generated/${Date.now()}-thumbnail.webp`
          const { data: upData } = await supabase.storage
            .from("course-media")
            .upload(storagePath, webpBuffer, { contentType: "image/webp", upsert: true })
          if (upData) {
            const { data: { publicUrl } } = supabase.storage.from("course-media").getPublicUrl(storagePath)
            thumbnailUrl = publicUrl
          }
        } catch {
          // image upload failed — thumbnail stays null
        }
      }
    }

    return NextResponse.json({ course, category, level, thumbnailUrl })
  } catch (err) {
    console.error("[generate-course]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
