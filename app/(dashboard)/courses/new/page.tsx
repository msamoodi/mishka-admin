import Link from "next/link"
import NewCourseClient from "./NewCourseClient"

export default function NewCoursePage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/courses" className="text-sm text-gray-500 hover:text-gray-900">← Courses</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">New Course</h1>
      </div>
      <NewCourseClient />
    </div>
  )
}
