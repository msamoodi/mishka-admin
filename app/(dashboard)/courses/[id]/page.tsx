import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import CourseEditClient from "./CourseEditClient"

export const dynamic = "force-dynamic"

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: course }, { data: lessons }, { data: quizQuestions }, { data: objectives }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).single(),
    supabase.from("lessons").select("*").eq("course_id", id).order("order_index"),
    supabase.from("quiz_questions").select("*").eq("course_id", id).order("order_index"),
    supabase.from("course_objectives").select("id, objective, order_index").eq("course_id", id).order("order_index"),
  ])

  if (!course) notFound()

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <Link href="/courses" className="text-sm text-gray-500 hover:text-gray-900">← Courses</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">Edit Course</h1>
        <p className="text-sm text-gray-500 mt-0.5">{course.slug}</p>
      </div>

      <CourseEditClient
        courseId={id}
        course={course}
        lessons={lessons ?? []}
        quizQuestions={quizQuestions ?? []}
        objectives={objectives ?? []}
      />
    </div>
  )
}
