import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      lessonId, courseId, lessonType, title,
      paragraph1, image, paragraph2, callout, audio,
      order_index, is_published, questions,
    } = body

    if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 })

    const supabase = createServiceClient()

    const lessonPayload: Record<string, unknown> = {
      course_id:    courseId,
      title:        title?.trim(),
      lesson_type:  lessonType,
      order_index:  order_index ?? 0,
      is_published: is_published ?? false,
      // Flat content columns — null them for quiz lessons
      paragraph1:   lessonType === "content" ? (paragraph1?.trim() || null) : null,
      image:        lessonType === "content" ? (image?.trim()      || null) : null,
      paragraph2:   lessonType === "content" ? (paragraph2?.trim() || null) : null,
      callout:      lessonType === "content" ? (callout?.trim()    || null) : null,
      audio:        audio?.trim() || null,
    }

    let savedLessonId = lessonId

    if (lessonId) {
      const { error } = await supabase.from("lessons").update(lessonPayload).eq("id", lessonId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { data, error } = await supabase.from("lessons").insert(lessonPayload).select("id").single()
      if (error || !data) return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 })
      savedLessonId = data.id
    }

    // Sync quiz questions: delete all then re-insert
    if (lessonType === "quiz" && Array.isArray(questions)) {
      await supabase.from("quiz_questions").delete().eq("lesson_id", savedLessonId)
      if (questions.length > 0) {
        const qRows = questions.map((q: any, i: number) => ({
          course_id:     courseId,
          lesson_id:     savedLessonId,
          question:      q.question?.trim(),
          options:       q.options,
          correct_index: q.correct_index,
          explanation:   q.explanation?.trim() ?? "",
          order_index:   i,
        }))
        const { error: qErr } = await supabase.from("quiz_questions").insert(qRows)
        if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({ lessonId: savedLessonId })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
