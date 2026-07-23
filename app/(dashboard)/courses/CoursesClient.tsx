"use client"
import { useState } from "react"
import Link from "next/link"
import DeleteCourseButton from "./DeleteCourseButton"
import { SortableTh } from "@/components/SortableTh"
import { categoryLabel } from "@/lib/categoryLabel"

type Course = {
  id: string
  slug: string
  course_name: string
  category: string
  level: string
  is_published: boolean
  display_order: number
  course_type: string
  created_at: string | null
  lesson_count: number
  quiz_count: number
}

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

const CATEGORIES = [
  { value: "product-design",       label: "Product Design" },
  { value: "digital-marketing",    label: "Digital Marketing" },
  { value: "branding-design",      label: "Branding Design" },
  { value: "user-research",        label: "User Research" },
  { value: "data-and-ai-literacy", label: "Data & AI Literacy" },
]

type SortCol = "course_name" | "course_type" | "category" | "level" | "lesson_count" | "is_published" | "created_at"

export default function CoursesClient({ courses }: { courses: Course[] }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")
  const [level, setLevel] = useState("")
  const [status, setStatus] = useState("")
  const [courseType, setCourseType] = useState("")
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [sortCol, setSortCol] = useState<SortCol | "">("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const onSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortCol(col as SortCol); setSortDir("asc"); setPage(1) }
  }

  const filtered = courses.filter(c => {
    if (query.trim() && !(
      c.course_name.toLowerCase().includes(query.toLowerCase()) ||
      c.slug.toLowerCase().includes(query.toLowerCase())
    )) return false
    if (category && c.category !== category) return false
    if (level && c.level !== level) return false
    if (status === "published" && !c.is_published) return false
    if (status === "draft" && c.is_published) return false
    if (courseType && c.course_type !== courseType) return false
    return true
  })

  const sorted = sortCol ? [...filtered].sort((a, b) => {
    let av: string | number, bv: string | number
    if (sortCol === "is_published") { av = a.is_published ? 1 : 0; bv = b.is_published ? 1 : 0 }
    else if (sortCol === "lesson_count") { av = a.lesson_count; bv = b.lesson_count }
    else if (sortCol === "created_at") { av = a.created_at ?? ""; bv = b.created_at ?? "" }
    else { av = (a[sortCol] ?? "").toString().toLowerCase(); bv = (b[sortCol] ?? "").toString().toLowerCase() }
    return sortDir === "asc" ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0)
  }) : filtered

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Courses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length}{query ? ` of ${courses.length}` : ""} courses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/courses/import"
            className="h-9 px-4 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            Bulk Import
          </Link>
          <Link
            href="/courses/new"
            className="h-9 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            + New Course
          </Link>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search courses…"
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1) }}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs"
            >✕</button>
          )}
        </div>

        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1) }}
          className={`h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white transition-colors ${category ? "border-gray-900 text-gray-900 font-medium" : "border-gray-300 text-gray-500"}`}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <select
          value={level}
          onChange={e => { setLevel(e.target.value); setPage(1) }}
          className={`h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white transition-colors ${level ? "border-gray-900 text-gray-900 font-medium" : "border-gray-300 text-gray-500"}`}
        >
          <option value="">All Levels</option>
          <option value="basic">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className={`h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white transition-colors ${status ? "border-gray-900 text-gray-900 font-medium" : "border-gray-300 text-gray-500"}`}
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={courseType}
          onChange={e => { setCourseType(e.target.value); setPage(1) }}
          className={`h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white transition-colors ${courseType ? "border-gray-900 text-gray-900 font-medium" : "border-gray-300 text-gray-500"}`}
        >
          <option value="">All Types</option>
          <option value="standard">Standard</option>
          <option value="video">Video</option>
        </select>

        {(category || level || status || courseType) && (
          <button
            onClick={() => { setCategory(""); setLevel(""); setStatus(""); setCourseType(""); setPage(1) }}
            className="h-10 px-3 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <SortableTh col="course_name" label="Course"   sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="course_type" label="Type"     sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="category"    label="Category" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="level"       label="Level"    sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="lesson_count" label="Lessons" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="is_published" label="Status"  sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="created_at"  label="Created" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                  {query ? `No courses matching "${query}"` : "No courses yet. Create your first one."}
                </td>
              </tr>
            )}
            {paginated.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{c.course_name}</p>
                  <p className="text-xs text-gray-400">{c.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.course_type === "video" ? "bg-pink-50 text-pink-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {c.course_type === "video" ? "Video" : "Standard"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{categoryLabel(c.category)}</td>
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
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <Link
                      href={`/courses/${c.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/courses/${c.id}/lessons`}
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

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="h-8 px-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          >
            {[20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-2">
            {filtered.length === 0 ? "0" : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)}`} of {filtered.length}
          </span>
          <button
            onClick={() => setPage(1)}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default transition-colors"
            aria-label="First page"
          >«</button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default transition-colors"
            aria-label="Previous page"
          >‹</button>
          <span className="px-2 font-medium text-gray-700">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default transition-colors"
            aria-label="Next page"
          >›</button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={currentPage === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default transition-colors"
            aria-label="Last page"
          >»</button>
        </div>
      </div>
    </div>
  )
}
