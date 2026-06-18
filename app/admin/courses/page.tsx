import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import DeleteCourseButton from "./DeleteCourseButton"

export const dynamic = "force-dynamic"

const LEVEL_LABEL: Record<string, string> = {
  basic: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
}

const LEVEL_COLOR: Record<string, string> = {
  basic: "bg-blue-50 text-blue-700",
  intermediate: "bg-purple-50 text-purple-700",
  advanced: "bg-orange-50 text-orange-700",
}

export default async function CoursesPage() {
  const supabase = await createClient()
  const { data: rawCourses } = await supabase
    .from("courses")
    .select("id, slug, course_name, category, level, is_published, display_order, lessons(count), quiz_questions(count)")
    .order("display_order", { ascending: true })

  const courses = (rawCourses ?? []).map((c) => ({
    ...c,
    lesson_count: (c.lessons as unknown as { count: number }[])?.[0]?.count ?? 0,
    quiz_count: (c.quiz_questions as unknown as { count: number }[])?.[0]?.count ?? 0,
  }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Courses</h1>
          <p className="text-sm text-gray-500 mt-0.5">{courses?.length ?? 0} total</p>
        </div>
        <Link
          href="/admin/courses/new"
          className="h-9 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          + New Course
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500">Course</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Level</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Lessons</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {courses?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  No courses yet. Create your first one.
                </td>
              </tr>
            )}
            {courses?.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{c.course_name}</p>
                  <p className="text-xs text-gray-400">{c.slug}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 capitalize">{c.category.replace(/-/g, " ")}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLOR[c.level] ?? "bg-gray-100 text-gray-600"}`}>
                    {LEVEL_LABEL[c.level] ?? c.level}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.lesson_count} lessons · {c.quiz_count} quizzes</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.is_published ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {c.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <Link
                      href={`/admin/courses/${c.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/courses/${c.id}/lessons`}
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Lessons
                    </Link>
                    <DeleteCourseButton id={c.id} name={c.course_name} />
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
