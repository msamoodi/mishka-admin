import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getOpenAI } from "@/lib/openai"
import sharp from "sharp"

export const maxDuration = 300

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export async function POST(req: NextRequest) {
  try {
    const { course, category, level, thumbnailUrl, generateAudio, generateLessonImages, lessonImageStyle } = await req.json()
    const supabase = createServiceClient()

    // 1 — insert the course row
    const { data: courseRow, error: cErr } = await supabase
      .from("courses")
      .insert({
        course_name:  course.course_name,
        slug:         slugify(course.course_name),
        category,
        level,
        description:  course.description,
        time_to_read: course.time_to_read,
        tags:         course.tags,
        is_published: false,
        course_type:  "standard",
        display_order: 0,
        ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
      })
      .select("id")
      .single()

    if (cErr || !courseRow) return NextResponse.json({ error: cErr?.message ?? "Course insert failed" }, { status: 500 })
    const courseId = courseRow.id

    // 2 — insert objectives
    if (course.objectives?.length) {
      await supabase.from("course_objectives").insert(
        course.objectives.map((obj: string, i: number) => ({
          course_id:   courseId,
          objective:   obj,
          order_index: i,
        }))
      )
    }

    // 3 — iterate unified items array (content lessons interleaved with quizzes)
    type CourseItem = {
      type: string
      title: string
      paragraph1: string
      paragraph2: string
      callout: string
      questions: unknown[]
    }

    const allItems: CourseItem[] = course.items ?? []

    let orderIndex = 0
    const contentInserts: object[] = []
    const contentItems: CourseItem[] = []  // parallel to contentInserts for media generation
    const quizInserts: Array<{ lessonData: object; questions: unknown[] }> = []

    for (const item of allItems) {
      const isQuiz = item.type === "quiz" || (Array.isArray(item.questions) && item.questions.length > 0 && !item.paragraph1)
      if (isQuiz) {
        quizInserts.push({
          lessonData: {
            course_id:    courseId,
            title:        item.title,
            lesson_type:  "quiz",
            order_index:  orderIndex++,
            is_published: true,
          },
          questions: item.questions ?? [],
        })
      } else {
        contentItems.push(item)
        contentInserts.push({
          course_id:    courseId,
          title:        item.title,
          lesson_type:  "content",
          paragraph1:   item.paragraph1,
          paragraph2:   item.paragraph2 || null,
          callout:      item.callout    || null,
          order_index:  orderIndex++,
          is_published: true,
        })
      }
    }

    // Insert all content lessons (capture IDs for audio/image generation)
    const { data: insertedLessons } = await supabase.from("lessons").insert(contentInserts).select("id")

    // Insert each quiz lesson + its questions sequentially (need the lesson id)
    for (const { lessonData, questions } of quizInserts) {
      const { data: qLesson } = await supabase
        .from("lessons")
        .insert(lessonData)
        .select("id")
        .single()

      if (qLesson) {
        type Question = { question: string; options: string[]; correct_index: number; explanation: string }
        await supabase.from("quiz_questions").insert(
          (questions as Question[]).map((q, qi) => ({
            lesson_id:     qLesson.id,
            course_id:     courseId,
            question:      q.question,
            options:       q.options,
            correct_index: q.correct_index,
            explanation:   q.explanation,
            order_index:   qi,
          }))
        )
      }
    }

    // Generate TTS audio for each content lesson if requested
    if (generateAudio && insertedLessons) {
      const openai = getOpenAI()
      for (let i = 0; i < insertedLessons.length; i++) {
        const lessonId = insertedLessons[i].id
        const l = contentItems[i]
        // Include callout so the narrated text matches the app's sync function exactly
        const text = [l.paragraph1, l.paragraph2 || "", l.callout || ""]
          .filter(Boolean).join(" ").trim().slice(0, 4096)
        if (!text) continue
        try {
          // "cedar" is not a valid tts-1 voice; use "nova" (warm, professional)
          const mp3 = await openai.audio.speech.create({ model: "tts-1", voice: "nova", input: text })
          const buffer = Buffer.from(await mp3.arrayBuffer())
          const storagePath = `audio/ai-generated/${courseId}/${Date.now()}-lesson-${i}.mp3`
          const { error: upErr } = await supabase.storage
            .from("course-media")
            .upload(storagePath, buffer, { contentType: "audio/mpeg", upsert: true })
          if (!upErr) {
            const { data: { publicUrl } } = supabase.storage.from("course-media").getPublicUrl(storagePath)
            await supabase.from("lessons").update({ audio: publicUrl }).eq("id", lessonId)
          }
        } catch (audioErr) {
          console.error(`[save-generated-course] audio error for lesson ${i}:`, audioErr)
        }
      }
    }

    // Generate cover images for each content lesson if requested
    if (generateLessonImages && insertedLessons) {
      const openai = getOpenAI()
      const categoryLabel = course.course_name // use course name for context
      for (let i = 0; i < insertedLessons.length; i++) {
        const lessonId = insertedLessons[i].id
        const l = contentItems[i]
        const lessonSummary = [l.paragraph1, l.paragraph2].filter(Boolean).join(" ").slice(0, 200)
        const rawStyle = lessonImageStyle?.trim() ?? ""
        const prompt = rawStyle.includes("{LESSON_TITLE}") || rawStyle.includes("{LESSON_SUMMARY}")
          ? rawStyle
              .replace(/\{LESSON_TITLE\}/g, l.title)
              .replace(/\{LESSON_SUMMARY\}/g, lessonSummary)
          : rawStyle
            ? `Cover image for an online course lesson titled "${l.title}" from the course "${categoryLabel}". Style: ${rawStyle}. Square format, no text, no typography.`
            : `Cover image for an online course lesson titled "${l.title}" from the course "${categoryLabel}". Style: clean flat illustration, professional, modern. Square format, no text, no typography.`
        try {
          const imgRes = await openai.images.generate({
            model: "gpt-image-1",
            prompt,
            n: 1,
            size: "1024x1024",
            quality: "medium",
          })
          const b64 = imgRes.data?.[0]?.b64_json
          if (b64) {
            const pngBuffer = Buffer.from(b64, "base64")
            let uploadBuffer: Buffer = pngBuffer
            let ext = "png"
            let mime = "image/png"
            try {
              uploadBuffer = await sharp(pngBuffer).webp({ quality: 82 }).toBuffer()
              ext = "webp"; mime = "image/webp"
            } catch {
              // sharp unavailable or failed — fall back to PNG
            }
            const storagePath = `images/ai-generated/${courseId}/${Date.now()}-lesson-${i}.${ext}`
            const { error: upErr } = await supabase.storage
              .from("course-media")
              .upload(storagePath, uploadBuffer, { contentType: mime, upsert: true })
            if (!upErr) {
              const { data: { publicUrl } } = supabase.storage.from("course-media").getPublicUrl(storagePath)
              // save to both columns: `image` (shown in lesson body) and `cover_image_url` (lesson card cover)
              await supabase.from("lessons").update({ image: publicUrl, cover_image_url: publicUrl }).eq("id", lessonId)
            }
          }
        } catch (imgErr) {
          console.error(`[save-generated-course] image error for lesson ${i}:`, imgErr)
        }
      }
    }

    return NextResponse.json({ courseId })
  } catch (err) {
    console.error("[save-generated-course]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
