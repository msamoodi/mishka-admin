import { createServiceClient } from "@/lib/supabase/server"
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
  const lessonType = type === "quiz" ? "quiz" : type === "video" ? "video" : "content"

  const supabase = createServiceClient()
  const { data: course } = await supabase.from("courses").select("id, course_name, category, slug, course_type").eq("id", id).single()
  if (!course) notFound()

  // Next order_index
  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", id)

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <Link href="/courses" className="hover:text-gray-700">Courses</Link>
          <span>/</span>
          <Link href={`/courses/${id}/lessons`} className="hover:text-gray-700">{course.course_name}</Link>
        </div>
        <Link href={`/courses/${id}/lessons`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 font-medium mb-2">
          ← Back to {course.course_name}
        </Link>
        <h1 className="text-xl font-bold text-gray-900">
          {lessonType === "quiz" ? "New Quiz" : lessonType === "video" ? "New Video" : "New Lesson"}
        </h1>
      </div>
      <LessonForm courseId={id} courseType={course.course_type ?? "standard"} lessonType={lessonType} defaultOrderIndex={count ?? 0} courseCategory={course.category} courseSlug={course.slug} />
    </div>
  )
}
