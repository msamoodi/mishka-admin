import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export async function POST(req: NextRequest) {
  try {
    const { course, category, level } = await req.json()
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

    // 3 — build an interleaved list: lessons + quizzes ordered by position
    type Lesson = { title: string; paragraph1: string; paragraph2: string; callout: string }
    type Quiz   = { title: string; after_lesson_index: number; questions: unknown[] }

    const lessons: Lesson[] = course.lessons ?? []
    const quizzes: Quiz[]   = course.quizzes ?? []

    // Map: after_lesson_index → quiz
    const quizAfter = new Map<number, Quiz>()
    for (const q of quizzes) quizAfter.set(q.after_lesson_index, q)

    let orderIndex = 0
    const lessonInserts = []
    const quizInserts: Array<{ lessonData: object; questions: unknown[] }> = []

    for (let i = 0; i < lessons.length; i++) {
      const l = lessons[i]
      lessonInserts.push({
        course_id:   courseId,
        title:       l.title,
        lesson_type: "content",
        paragraph1:  l.paragraph1,
        paragraph2:  l.paragraph2 || null,
        callout:     l.callout    || null,
        order_index: orderIndex++,
        is_published: true,
      })

      const quiz = quizAfter.get(i)
      if (quiz) {
        quizInserts.push({
          lessonData: {
            course_id:   courseId,
            title:       quiz.title,
            lesson_type: "quiz",
            order_index: orderIndex++,
            is_published: true,
          },
          questions: quiz.questions,
        })
      }
    }

    // Insert all content lessons
    await supabase.from("lessons").insert(lessonInserts)

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

    return NextResponse.json({ courseId })
  } catch (err) {
    console.error("[save-generated-course]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
