import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import DeleteLessonButton from "./DeleteLessonButton"

export const dynamic = "force-dynamic"

const TYPE_BADGE: Record<string, string> = {
  content: "bg-blue-50 text-blue-700",
  quiz:    "bg-amber-50 text-amber-700",
}

export default async function LessonsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: course }, { data: lessons }] = await Promise.all([
    supabase.from("courses").select("id, course_name, lesson_count, quiz_count").eq("id", id).single(),
    supabase.from("lessons").select("id, title, lesson_type, order_index").eq("course_id", id).order("order_index"),
  ])

  if (!course) notFound()

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/courses" className="text-sm text-gray-500 hover:text-gray-900">← Courses</Link>
        <span className="text-gray-300 mx-2">/</span>
        <Link href={`/courses/${id}`} className="text-sm text-gray-500 hover:text-gray-900">{course.course_name}</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">Lessons & Quizzes</h1>
        <p className="text-sm text-gray-500 mt-0.5">{course.lesson_count} lessons · {course.quiz_count} quizzes</p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Link
          href={`/courses/${id}/lessons/new?type=content`}
          className="h-9 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          + Add Lesson
        </Link>
        <Link
          href={`/courses/${id}/lessons/new?type=quiz`}
          className="h-9 px-4 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
        >
          + Add Quiz
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-12">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 w-32" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lessons?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                  No lessons yet. Add your first lesson or quiz.
                </td>
              </tr>
            )}
            {lessons?.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{l.order_index}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{l.title}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_BADGE[l.lesson_type] ?? "bg-gray-100 text-gray-600"}`}>
                    {l.lesson_type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <Link
                      href={`/courses/${id}/lessons/${l.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Edit
                    </Link>
                    <DeleteLessonButton id={l.id} courseId={id} title={l.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
