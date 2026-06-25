import Link from "next/link"
import ImportClient from "./ImportClient"

export default function ImportCoursesPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/courses" className="text-sm text-gray-500 hover:text-gray-900">← Courses</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">Bulk Import Courses</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Paste a JSON array of courses (with nested objectives, lessons, and quiz questions) to create or update them in one go.
        </p>
      </div>
      <ImportClient />
    </div>
  )
}
