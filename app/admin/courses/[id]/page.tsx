import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import CourseForm from "../CourseForm"

export const dynamic = "force-dynamic"

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single()

  if (!course) notFound()

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/courses" className="text-sm text-gray-500 hover:text-gray-900">← Courses</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">Edit Course</h1>
        <p className="text-sm text-gray-500 mt-0.5">{course.slug}</p>
      </div>

      <div className="mb-4">
        <Link
          href={`/admin/courses/${id}/lessons`}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          📖 Manage Lessons & Quizzes →
        </Link>
      </div>

      <CourseForm initial={course} />
    </div>
  )
}
