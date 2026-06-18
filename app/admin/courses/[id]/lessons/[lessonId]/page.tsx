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
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <Link href="/admin/courses" className="hover:text-gray-700">Courses</Link>
          <span>/</span>
          <Link href={`/admin/courses/${id}/lessons`} className="hover:text-gray-700">{course.course_name}</Link>
        </div>
        <Link href={`/admin/courses/${id}/lessons`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 font-medium mb-2">
          ← Back to {course.course_name}
        </Link>
        <h1 className="text-xl font-bold text-gray-900">
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
