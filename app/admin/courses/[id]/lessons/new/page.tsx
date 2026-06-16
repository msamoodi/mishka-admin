import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import LessonForm from "../LessonForm"

export const dynamic = "force-dynamic"

export default async function NewLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string }>
}) {
  const { id } = await params
  const { type } = await searchParams
  const lessonType = type === "quiz" ? "quiz" : "content"

  const supabase = await createClient()
  const { data: course } = await supabase.from("courses").select("id, course_name").eq("id", id).single()
  if (!course) notFound()

  // Next order_index
  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", id)

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/courses" className="text-sm text-gray-500 hover:text-gray-900">← Courses</Link>
        <span className="text-gray-300 mx-2">/</span>
        <Link href={`/admin/courses/${id}/lessons`} className="text-sm text-gray-500 hover:text-gray-900">{course.course_name}</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">
          {lessonType === "quiz" ? "New Quiz" : "New Lesson"}
        </h1>
      </div>
      <LessonForm courseId={id} lessonType={lessonType} defaultOrderIndex={count ?? 0} />
    </div>
  )
}
