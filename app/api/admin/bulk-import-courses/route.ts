import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

type ImportQuestion = {
  question: string
  options: string[]
  correct_index: number
  explanation?: string
}

type ImportLesson = {
  lesson_type: "content" | "quiz" | "video"
  title: string
  is_published?: boolean
  paragraph1?: string
  image?: string
  paragraph2?: string
  callout?: string
  audio?: string
  video_url?: string
  questions?: ImportQuestion[]
}

type ImportCourse = {
  course_name: string
  slug: string
  category: string
  level: string
  description?: string
  time_to_read?: number
  display_order?: number
  tags?: string[]
  thumbnail_url?: string
  is_published?: boolean
  course_type?: "standard" | "video"
  objectives?: string[]
  lessons?: ImportLesson[]
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export async function POST(request: NextRequest) {
  let body: { courses?: ImportCourse[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const courses = body.courses
  if (!Array.isArray(courses) || courses.length === 0) {
    return NextResponse.json({ error: "Expected a non-empty \"courses\" array" }, { status: 400 })
  }

  const supabase = createServiceClient()
  const results: { slug: string; ok: boolean; error?: string; courseId?: string }[] = []

  for (const course of courses) {
    const slug = course.slug?.trim() || slugify(course.course_name ?? "")

    try {
      if (!course.course_name?.trim()) throw new Error("course_name is required")
      if (!slug) throw new Error("slug could not be determined")

      const coursePayload = {
        course_name:   course.course_name.trim(),
        slug,
        category:      course.category,
        level:         course.level,
        description:   course.description?.trim() ?? "",
        time_to_read:  course.time_to_read ?? 30,
        display_order: course.display_order ?? 0,
        tags:          course.tags ?? [],
        thumbnail_url: course.thumbnail_url?.trim() || null,
        is_published:  course.is_published ?? false,
        course_type:   course.course_type ?? "standard",
      }

      // Upsert by slug
      const { data: existing } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle()

      let courseId: string
      if (existing) {
        courseId = existing.id
        const { error } = await supabase.from("courses").update(coursePayload).eq("id", courseId)
        if (error) throw new Error(error.message)
      } else {
        const { data, error } = await supabase.from("courses").insert(coursePayload).select("id").single()
        if (error || !data) throw new Error(error?.message ?? "Insert failed")
        courseId = data.id
      }

      // Replace objectives
      await supabase.from("course_objectives").delete().eq("course_id", courseId)
      const objectives = (course.objectives ?? []).filter((o) => o?.trim())
      if (objectives.length > 0) {
        const rows = objectives.map((objective, i) => ({ course_id: courseId, objective: objective.trim(), order_index: i }))
        const { error } = await supabase.from("course_objectives").insert(rows)
        if (error) throw new Error(`objectives: ${error.message}`)
      }

      // Replace lessons (+ nested quiz questions)
      await supabase.from("quiz_questions").delete().eq("course_id", courseId)
      await supabase.from("lessons").delete().eq("course_id", courseId)

      const lessons = course.lessons ?? []
      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i]
        if (!lesson.title?.trim()) throw new Error(`lesson #${i + 1}: title is required`)

        const lessonPayload = {
          course_id:    courseId,
          title:        lesson.title.trim(),
          lesson_type:  lesson.lesson_type,
          order_index:  i,
          is_published: lesson.is_published ?? false,
          paragraph1:   lesson.lesson_type === "content" ? (lesson.paragraph1?.trim() || null) : null,
          image:        lesson.lesson_type === "content" ? (lesson.image?.trim() || null) : null,
          paragraph2:   lesson.lesson_type === "content" ? (lesson.paragraph2?.trim() || null) : null,
          callout:      lesson.lesson_type === "content" ? (lesson.callout?.trim() || null) : null,
          audio:        lesson.audio?.trim() || null,
          video_url:    lesson.lesson_type === "video" ? (lesson.video_url?.trim() || null) : null,
        }

        const { data: lessonRow, error: lessonErr } = await supabase.from("lessons").insert(lessonPayload).select("id").single()
        if (lessonErr || !lessonRow) throw new Error(`lesson "${lesson.title}": ${lessonErr?.message ?? "insert failed"}`)

        if (lesson.lesson_type === "quiz" && Array.isArray(lesson.questions) && lesson.questions.length > 0) {
          const qRows = lesson.questions.map((q, qi) => ({
            course_id:     courseId,
            lesson_id:     lessonRow.id,
            question:      q.question?.trim() ?? "",
            options:       q.options ?? [],
            correct_index: q.correct_index ?? 0,
            explanation:   q.explanation?.trim() ?? "",
            order_index:   qi,
          }))
          const { error: qErr } = await supabase.from("quiz_questions").insert(qRows)
          if (qErr) throw new Error(`lesson "${lesson.title}" questions: ${qErr.message}`)
        }
      }

      results.push({ slug, ok: true, courseId })
    } catch (err) {
      results.push({ slug, ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return NextResponse.json({ results })
}
