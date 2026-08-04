import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getOpenAI } from "@/lib/openai"


export const maxDuration = 300

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

// Step 1: plan the full curriculum structure
const PLAN_SCHEMA = {
  name: "course_plan",
  strict: true,
  schema: {
    type: "object",
    properties: {
      course_name:  { type: "string" },
      description:  { type: "string", description: "Short 1–2 sentence course description shown to students" },
      tags:         { type: "array", items: { type: "string" }, description: "3–6 keyword tags" },
      time_to_read: { type: "number", description: "Estimated total study time in minutes" },
      objectives: {
        type: "array",
        description: "5 learning outcomes",
        items: { type: "string" },
      },
      lesson_plan: {
        type: "array",
        description: "Exactly 10 lesson outlines, ordered from foundational to advanced",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            focus: { type: "string", description: "2–3 sentences: the core concept, why it matters, and what the student will understand after this lesson" },
          },
          required: ["title", "focus"],
          additionalProperties: false,
        },
      },
    },
    required: ["course_name", "description", "tags", "time_to_read", "objectives", "lesson_plan"],
    additionalProperties: false,
  },
}

// Step 2: one call per lesson — writes full lesson content + its quiz
const LESSON_SCHEMA = {
  name: "lesson_with_quiz",
  strict: true,
  schema: {
    type: "object",
    properties: {
      title:      { type: "string" },
      paragraph1: { type: "string", description: "Main lesson content: 4–5 substantive sentences grounded in the book material" },
      paragraph2: { type: "string", description: "Supporting detail: 3–4 sentences of examples, case studies, or deeper explanation" },
      callout:    { type: "string", description: "One memorable insight or rule the student should retain (1 sentence)" },
      questions: {
        type: "array",
        description: "Exactly 4 quiz questions for this lesson",
        items: {
          type: "object",
          properties: {
            question:      { type: "string" },
            options:       { type: "array", items: { type: "string" }, description: "Exactly 4 answer options" },
            correct_index: { type: "number", description: "0-based index of the correct option" },
            explanation:   { type: "string", description: "Why the correct answer is right" },
          },
          required: ["question", "options", "correct_index", "explanation"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "paragraph1", "paragraph2", "callout", "questions"],
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
    const openai        = getOpenAI()

    const resolvedInstructions = (additionalInstructions ?? "")
      .replace(/\{COURSE_NAME\}/g, "the course derived from the provided book content")
      .replace(/\{LEVEL\}/g, levelLabel)
      .replace(/\{CATEGORY\}/g, categoryLabel)
      .trim()

    // ── Step 1: Plan the curriculum ──────────────────────────────────────────
    const planResponse = await openai.responses.create({
      model: "gpt-4o",
      instructions: `You are an expert curriculum designer for Mishka, a professional online learning platform.
Your task is to plan a complete course structure based on book content.
Rules:
- Ground every lesson topic in concepts actually present in the book
- Lessons must build progressively: foundations → application → synthesis
- No two lessons should cover overlapping material
- Do not include any markdown formatting
- Return ONLY the JSON object`,
      input: `Plan a ${levelLabel}-level ${categoryLabel} course based on the following book content.
${resolvedInstructions ? `Additional instructions: ${resolvedInstructions}\n` : ""}Create exactly 10 lessons ordered from foundational to advanced.

BOOK CONTENT:
${bookContext}`,
      text: {
        format: {
          type: "json_schema",
          name: PLAN_SCHEMA.name,
          strict: PLAN_SCHEMA.strict,
          schema: PLAN_SCHEMA.schema,
        },
      },
      max_output_tokens: 4000,
    })

    const plan = JSON.parse(planResponse.output_text ?? "{}")
    const lessonPlan: Array<{ title: string; focus: string }> = plan.lesson_plan ?? []

    // Lesson map — sent to each write call so lessons don't repeat each other
    const lessonPlanSummary = lessonPlan
      .map((l, i) => `Lesson ${i + 1}: "${l.title}" — ${l.focus}`)
      .join("\n")

    // ── Step 2: Write each lesson + quiz individually ────────────────────────
    type QuizQuestion = { question: string; options: string[]; correct_index: number; explanation: string }
    type LessonResult = { title: string; paragraph1: string; paragraph2: string; callout: string; questions: QuizQuestion[] }

    const items: Array<{
      type: "content" | "quiz"
      title: string
      paragraph1: string
      paragraph2: string
      callout: string
      questions: QuizQuestion[]
    }> = []

    for (let i = 0; i < lessonPlan.length; i++) {
      const outline = lessonPlan[i]

      const lessonResponse = await openai.responses.create({
        model: "gpt-4o",
        instructions: `You are writing a single lesson for a professional online course on ${categoryLabel} (${levelLabel} level).
Write with depth and clarity. Every claim must be grounded in the provided book material.
Rules:
- paragraph1: 4–5 substantive sentences, no platitudes
- paragraph2: 3–4 sentences of concrete examples or deeper explanation from the book
- callout: one memorable rule or insight the student should remember
- 4 quiz questions, each directly answerable from THIS lesson's content
- Each question has exactly 4 answer options; correct_index must be set
- Do not repeat content covered in other lessons
- No markdown formatting
- Return ONLY the JSON object`,
        input: `Write Lesson ${i + 1} of 10: "${outline.title}"
Focus for this lesson: ${outline.focus}

Full course plan (do NOT repeat content from other lessons):
${lessonPlanSummary}

BOOK CONTENT:
${bookContext}`,
        text: {
          format: {
            type: "json_schema",
            name: LESSON_SCHEMA.name,
            strict: LESSON_SCHEMA.strict,
            schema: LESSON_SCHEMA.schema,
          },
        },
        max_output_tokens: 3000,
      })

      const lesson = JSON.parse(lessonResponse.output_text ?? "{}") as LessonResult

      items.push({
        type: "content",
        title:      lesson.title      ?? outline.title,
        paragraph1: lesson.paragraph1 ?? "",
        paragraph2: lesson.paragraph2 ?? "",
        callout:    lesson.callout    ?? "",
        questions:  [],
      })
      items.push({
        type:       "quiz",
        title:      `Quiz: ${lesson.title ?? outline.title}`,
        paragraph1: "",
        paragraph2: "",
        callout:    "",
        questions:  lesson.questions ?? [],
      })
    }

    const course = {
      course_name:  plan.course_name  ?? "",
      description:  plan.description  ?? "",
      tags:         plan.tags         ?? [],
      time_to_read: plan.time_to_read ?? 60,
      objectives:   plan.objectives   ?? [],
      items,
    }

    // Optional: generate thumbnail
    let thumbnailUrl: string | null = null
    if (generateImage) {
      const resolvedImagePrompt = (imagePrompt ?? "")
        .replace(/\{COURSE_NAME\}/g, course.course_name ?? "")
        .replace(/\{COURSE_SUMMARY\}/g, course.description ?? "")
        .trim()
      const prompt = resolvedImagePrompt
        ? resolvedImagePrompt
        : `Professional course thumbnail for a ${levelLabel}-level ${categoryLabel} online course titled "${course.course_name}". Clean, modern, abstract illustration. Square format, no text.`

      try {
        const imgResponse = await openai.images.generate({
          model: "gpt-image-1",
          prompt,
          n: 1,
          size: "1024x1024",
          quality: "medium",
        })
        const b64 = imgResponse.data?.[0]?.b64_json
        if (b64) {
          const pngBuffer = Buffer.from(b64, "base64")
          const storagePath = `images/ai-generated/${Date.now()}-thumbnail.png`
          const { data: upData } = await supabase.storage
            .from("course-media")
            .upload(storagePath, pngBuffer, { contentType: "image/png", upsert: true })
          if (upData) {
            const { data: { publicUrl } } = supabase.storage.from("course-media").getPublicUrl(storagePath)
            thumbnailUrl = publicUrl
          }
        }
      } catch {
        // thumbnail failure is non-fatal
      }
    }

    return NextResponse.json({ course, category, level, thumbnailUrl })
  } catch (err) {
    console.error("[generate-course-deep]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
