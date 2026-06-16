import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import LessonForm from "../LessonForm"

export const dynamic = "force-dynamic"

export default async function EditLessonPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params
  const supabase = await createClient()

  const [{ data: course }, { data: lesson }, { data: quizQuestions }] = await Promise.all([
    supabase.from("courses").select("id, course_name").eq("id", id).single(),
    supabase.from("lessons").select("*").eq("id", lessonId).single(),
    supabase.from("quiz_questions").select("*").eq("lesson_id", lessonId).order("order_index"),
  ])

  if (!course || !lesson) notFound()

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/courses" className="text-sm text-gray-500 hover:text-gray-900">← Courses</Link>
        <span className="text-gray-300 mx-2">/</span>
        <Link href={`/admin/courses/${id}/lessons`} className="text-sm text-gray-500 hover:text-gray-900">{course.course_name}</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">
          {lesson.lesson_type === "quiz" ? "Edit Quiz" : "Edit Lesson"}
        </h1>
      </div>
      <LessonForm
        courseId={id}
        lessonType={lesson.lesson_type}
        defaultOrderIndex={lesson.order_index}
        initial={lesson}
        initialQuizQuestions={quizQuestions ?? []}
      />
    </div>
  )
}
