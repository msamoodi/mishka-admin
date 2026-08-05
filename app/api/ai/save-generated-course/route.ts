import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getOpenAI } from "@/lib/openai"

export const maxDuration = 300

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export async function POST(req: NextRequest) {
  let body: {
    course?: Record<string, unknown>
    category?: string
    level?: string
    thumbnailUrl?: string | null
    generateAudio?: boolean
    generateLessonImages?: boolean
    lessonImageStyle?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { course, category, level, thumbnailUrl, generateAudio, generateLessonImages, lessonImageStyle } = body
  if (!course || !category || !level) {
    return NextResponse.json({ error: "course, category and level are required" }, { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"))
      }
      try {
        send({ type: "progress", message: "Saving course…" })

        const supabase = createServiceClient()

        const { data: courseRow, error: cErr } = await supabase
          .from("courses")
          .insert({
            course_name:  course.course_name,
            slug:         slugify(String(course.course_name ?? "")),
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

        if (cErr || !courseRow) {
          send({ type: "error", error: cErr?.message ?? "Course insert failed" })
          return
        }
        const courseId = courseRow.id

        // Insert objectives
        if (Array.isArray(course.objectives) && course.objectives.length) {
          await supabase.from("course_objectives").insert(
            (course.objectives as string[]).map((obj, i) => ({
              course_id:   courseId,
              objective:   obj,
              order_index: i,
            }))
          )
        }

        send({ type: "progress", message: "Saving lessons and quizzes…" })

        type CourseItem = {
          type: string
          title: string
          paragraph1: string
          paragraph2: string
          callout: string
          questions: unknown[]
        }

        const allItems: CourseItem[] = (course.items as CourseItem[]) ?? []

        let orderIndex = 0
        const contentInserts: object[] = []
        const contentItems: CourseItem[] = []
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

        const { data: insertedLessons } = await supabase.from("lessons").insert(contentInserts).select("id")

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

        // Generate image + audio per content lesson (interleaved per lesson)
        if ((generateLessonImages || generateAudio) && insertedLessons) {
          const openai = getOpenAI()
          const total = insertedLessons.length

          for (let i = 0; i < total; i++) {
            const lessonId = insertedLessons[i].id
            const l = contentItems[i]

            if (generateLessonImages) {
              send({ type: "progress", message: `Generating image for lesson ${i + 1} of ${total}…` })
              const lessonSummary = [l.paragraph1, l.paragraph2].filter(Boolean).join(" ").slice(0, 200)
              const rawStyle = (lessonImageStyle ?? "").trim()
              const prompt = rawStyle.includes("{LESSON_TITLE}") || rawStyle.includes("{LESSON_SUMMARY}")
                ? rawStyle
                    .replace(/\{LESSON_TITLE\}/g, l.title)
                    .replace(/\{LESSON_SUMMARY\}/g, lessonSummary)
                : rawStyle
                  ? `Cover image for an online course lesson titled "${l.title}" from the course "${course.course_name}". Style: ${rawStyle}. Square format, no text, no typography.`
                  : `Cover image for an online course lesson titled "${l.title}" from the course "${course.course_name}". Style: clean flat illustration, professional, modern. Square format, no text, no typography.`
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
                  const storagePath = `images/ai-generated/${courseId}/${Date.now()}-lesson-${i}.png`
                  const { error: upErr } = await supabase.storage
                    .from("course-media")
                    .upload(storagePath, pngBuffer, { contentType: "image/png", upsert: true })
                  if (!upErr) {
                    const { data: { publicUrl } } = supabase.storage.from("course-media").getPublicUrl(storagePath)
                    await supabase.from("lessons").update({ image: publicUrl, cover_image_url: publicUrl }).eq("id", lessonId)
                  }
                }
              } catch (imgErr) {
                console.error(`[save-generated-course] image error for lesson ${i}:`, imgErr)
              }
            }

            if (generateAudio) {
              send({ type: "progress", message: `Generating audio for lesson ${i + 1} of ${total}…` })
              const text = [l.paragraph1, l.paragraph2 || "", l.callout || ""]
                .filter(Boolean).join(" ").trim().slice(0, 4096)
              if (text) {
                try {
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
          }
        }

        send({ type: "done", courseId })
      } catch (err) {
        console.error("[save-generated-course]", err)
        send({ type: "error", error: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
  })
}
