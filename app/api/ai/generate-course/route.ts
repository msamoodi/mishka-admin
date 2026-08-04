import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getOpenAI } from "@/lib/openai"

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
      lessons: {
        type: "array",
        description: "Ordered list of content lessons",
        items: {
          type: "object",
          properties: {
            title:      { type: "string" },
            paragraph1: { type: "string", description: "Main lesson content (2–4 paragraphs)" },
            paragraph2: { type: "string", description: "Supporting content or examples (optional, can be empty string)" },
            callout:    { type: "string", description: "A key insight or tip to highlight (1 sentence, can be empty string)" },
          },
          required: ["title", "paragraph1", "paragraph2", "callout"],
          additionalProperties: false,
        },
      },
      quizzes: {
        type: "array",
        description: "One quiz per 2–3 lessons, placed after the lessons it covers",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Quiz title, e.g. 'Quiz: Foundations'" },
            after_lesson_index: {
              type: "number",
              description: "0-based index of the lesson this quiz follows",
            },
            questions: {
              type: "array",
              minItems: 3,
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  question:      { type: "string" },
                  options:       { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                  correct_index: { type: "number", description: "0-based index of the correct option" },
                  explanation:   { type: "string", description: "Brief explanation of why the answer is correct" },
                },
                required: ["question", "options", "correct_index", "explanation"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "after_lesson_index", "questions"],
          additionalProperties: false,
        },
      },
    },
    required: ["course_name", "description", "tags", "time_to_read", "objectives", "lessons", "quizzes"],
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
- Return ONLY the JSON object`

    const userPrompt = `Create a ${levelLabel}-level ${categoryLabel} course based on the following book content.
${additionalInstructions ? `\nAdditional instructions: ${additionalInstructions}\n` : ""}
Generate 6–10 lessons with quizzes after every 2–3 lessons.

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
      const prompt = imagePrompt
        ? `${imagePrompt}. Course thumbnail for a ${levelLabel}-level ${categoryLabel} online course titled "${course.course_name}". Square format, no text.`
        : `Professional course thumbnail for a ${levelLabel}-level ${categoryLabel} online course titled "${course.course_name}". Clean, modern, abstract illustration. Square format, no text.`

      const imgResponse = await getOpenAI().images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url",
      })

      const tempUrl = imgResponse.data?.[0]?.url
      if (tempUrl) {
        // Download and re-upload to Supabase for a permanent URL
        try {
          const imgFetch = await fetch(tempUrl)
          const imgBuffer = Buffer.from(await imgFetch.arrayBuffer())
          const storagePath = `images/ai-generated/${Date.now()}-thumbnail.png`
          const { data: upData } = await supabase.storage
            .from("course-media")
            .upload(storagePath, imgBuffer, { contentType: "image/png", upsert: true })
          if (upData) {
            const { data: { publicUrl } } = supabase.storage.from("course-media").getPublicUrl(storagePath)
            thumbnailUrl = publicUrl
          } else {
            thumbnailUrl = tempUrl
          }
        } catch {
          thumbnailUrl = tempUrl
        }
      }
    }

    return NextResponse.json({ course, category, level, thumbnailUrl })
  } catch (err) {
    console.error("[generate-course]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
