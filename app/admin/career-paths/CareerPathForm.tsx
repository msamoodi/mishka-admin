"use client"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Toast, type ToastState } from "@/components/Toast"
import { AREAS, CATEGORIES, LEVELS } from "./constants"

const LEVEL_COLOR: Record<string, string> = {
  basic:        "bg-blue-50 text-blue-700",
  intermediate: "bg-purple-50 text-purple-700",
  advanced:     "bg-orange-50 text-orange-700",
}

export type Course = {
  id: string
  course_name: string
  level: string
  category: string
  is_published: boolean
}

export type CareerPath = {
  id: string
  title: string
  area: string
  category: string
  levels: string[]
  course_ids: string[]
  is_published: boolean
}

export default function CareerPathForm({
  initial,
  courses,
}: {
  initial?: CareerPath
  courses: Course[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? "")
  const [area, setArea] = useState(initial?.area ?? "")
  const [category, setCategory] = useState(initial?.category ?? "")
  const [levels, setLevels] = useState<string[]>(initial?.levels ?? [])
  const [courseIds, setCourseIds] = useState<string[]>(initial?.course_ids ?? [])
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const toggleLevel = (val: string) => {
    setLevels(prev =>
      prev.includes(val) ? prev.filter(l => l !== val) : [...prev, val]
    )
  }

  const toggleCourse = (id: string) => {
    setCourseIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const filteredCourses = levels.length > 0
    ? courses.filter(c => levels.includes(c.level))
    : courses

  const handleSave = async () => {
    if (!title.trim()) {
      setToast({ message: "Title is required", type: "error" })
      return
    }
    setSaving(true)
    const res = await fetch("/api/admin/save-career-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: initial?.id,
        title,
        area,
        category,
        levels,
        course_ids: courseIds,
        is_published: isPublished,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok || json.error) {
      setToast({ message: json.error ?? "Failed to save", type: "error" })
    } else {
      if (!initial?.id && json.id) {
        router.push(`/admin/career-paths/${json.id}`)
      } else {
        setToast({ message: "Saved successfully", type: "success" })
        router.refresh()
      }
    }
  }

  return (
    <>
      <Toast toast={toast} onClose={closeToast} />

      <div className="flex flex-col gap-6 max-w-3xl">

        {/* ── Info ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Career Path Info</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Become a Product Designer"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={e => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">Published</span>
            </label>
          </div>
        </div>

        {/* ── Area of Interest ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Area of Interest</h2>
          <p className="text-xs text-gray-400 mb-4">The learn-area this path belongs to</p>
          <div className="grid grid-cols-2 gap-2">
            {AREAS.map(a => {
              const isSelected = area === a.value
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setArea(prev => prev === a.value ? "" : a.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all text-sm ${
                    isSelected
                      ? "border-gray-900 bg-gray-50 font-medium text-gray-900"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    isSelected ? "border-gray-900 bg-gray-900" : "border-gray-300"
                  }`}>
                    {isSelected && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {a.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Category ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Category</h2>
          <p className="text-xs text-gray-400 mb-4">Primary course category for this path</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(prev => prev === c.value ? "" : c.value)}
                className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                  category === c.value
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Levels ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Course Levels</h2>
          <p className="text-xs text-gray-400 mb-4">Which difficulty levels are included in this path</p>
          <div className="flex gap-3">
            {LEVELS.map(l => (
              <button
                key={l.value}
                type="button"
                onClick={() => toggleLevel(l.value)}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  levels.includes(l.value)
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Courses ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Courses</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {levels.length > 0
                  ? `Showing ${filteredCourses.length} course${filteredCourses.length !== 1 ? "s" : ""} for selected levels`
                  : "Showing all courses — select levels above to filter"}
              </p>
            </div>
            {courseIds.length > 0 && (
              <span className="text-xs font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                {courseIds.length} selected
              </span>
            )}
          </div>

          {filteredCourses.length === 0 ? (
            <p className="px-6 py-10 text-center text-gray-400 text-sm">
              No courses match the selected levels
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredCourses.map(c => {
                const isSelected = courseIds.includes(c.id)
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors ${
                      isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCourse(c.id)}
                      className="w-4 h-4 rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.course_name}</p>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">{c.category.replace(/-/g, " ")}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLOR[c.level] ?? "bg-gray-100 text-gray-600"}`}>
                        {LEVELS.find(l => l.value === c.level)?.label ?? c.level}
                      </span>
                      {!c.is_published && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Draft
                        </span>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Save ─────────────────────────────────────────────────── */}
        <div className="flex justify-end pb-8">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-6 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Career Path"}
          </button>
        </div>

      </div>
    </>
  )
}
