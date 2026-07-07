"use client"
import { withBasePath } from "@/lib/basePath"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Toast, type ToastState } from "@/components/Toast"
import { AREAS, CATEGORIES, LEVELS, CAREER_LEVELS } from "./constants"
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

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

function SortableCourseRow({ course, index, onRemove }: { course: Course; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: course.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        tabIndex={-1}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
        aria-label="Drag to reorder"
      >
        <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
          <circle cx="3" cy="3"  r="1.5" /><circle cx="9" cy="3"  r="1.5" />
          <circle cx="3" cy="9"  r="1.5" /><circle cx="9" cy="9"  r="1.5" />
          <circle cx="3" cy="15" r="1.5" /><circle cx="9" cy="15" r="1.5" />
        </svg>
      </button>
      <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-500 flex-shrink-0">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{course.course_name}</p>
        <p className="text-xs text-gray-400 capitalize mt-0.5">{course.category.replace(/-/g, " ")}</p>
      </div>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${LEVEL_COLOR[course.level] ?? "bg-gray-100 text-gray-600"}`}>
        {LEVELS.find(l => l.value === course.level)?.label ?? course.level}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 ml-1"
        aria-label="Remove"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

export type CareerPath = {
  id: string
  title: string
  area: string
  categories: string[]
  levels: string[]
  career_levels: string[]
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
  const [categories, setCategories] = useState<string[]>(initial?.categories ?? [])
  const [levels, setLevels] = useState<string[]>(initial?.levels ?? [])
  const [careerLevels, setCareerLevels] = useState<string[]>(initial?.career_levels ?? [])
  const [courseIds, setCourseIds] = useState<string[]>(initial?.course_ids ?? [])
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleCourseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setCourseIds(prev => {
      const oldIdx = prev.indexOf(active.id as string)
      const newIdx = prev.indexOf(over.id as string)
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  const toggleLevel = (val: string) => {
    setLevels(prev =>
      prev.includes(val) ? prev.filter(l => l !== val) : [...prev, val]
    )
  }

  const toggleCareerLevel = (val: string) => {
    setCareerLevels(prev =>
      prev.includes(val) ? prev.filter(l => l !== val) : [...prev, val]
    )
  }

  const toggleCourse = (id: string) => {
    setCourseIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const toggleCategory = (val: string) => {
    setCategories(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]
    )
  }

  const filteredCourses = courses.filter(c => {
    const matchesLevel    = levels.length === 0     || levels.includes(c.level)
    const matchesCategory = categories.length === 0 || categories.includes(c.category)
    return matchesLevel && matchesCategory
  })

  const handleSave = async () => {
    if (!title.trim()) {
      setToast({ message: "Title is required", type: "error" })
      return
    }
    setSaving(true)
    const res = await fetch(withBasePath("/api/admin/save-career-path"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: initial?.id,
        title,
        area,
        categories,
        levels,
        career_levels: careerLevels,
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
        router.push(`/career-paths/${json.id}`)
      } else {
        setToast({ message: "Saved successfully", type: "success" })
        router.refresh()
      }
    }
  }

  return (
    <>
      <Toast toast={toast} onClose={closeToast} />

      <div className="flex flex-col gap-6 max-w-5xl">

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

        {/* ── Categories ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Categories</h2>
          <p className="text-xs text-gray-400 mb-4">Course categories included in this path — select all that apply</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleCategory(c.value)}
                className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                  categories.includes(c.value)
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Career Level ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Who is this for?</h2>
          <p className="text-xs text-gray-400 mb-4">Career level(s) this path targets — matched to user profiles</p>
          <div className="flex gap-3">
            {CAREER_LEVELS.map(l => (
              <button
                key={l.value}
                type="button"
                onClick={() => toggleCareerLevel(l.value)}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  careerLevels.includes(l.value)
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                {l.label}
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

        {/* ── Courses: picker (left) + order (right) ───────────────── */}
        <div className="flex gap-4 items-start">

          {/* Course picker */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Add Courses</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {levels.length > 0 || categories.length > 0
                  ? `${filteredCourses.length} course${filteredCourses.length !== 1 ? "s" : ""} match your filters`
                  : "Showing all courses — select categories or levels above to filter"}
              </p>
            </div>

            {filteredCourses.length === 0 ? (
              <p className="px-6 py-10 text-center text-gray-400 text-sm">
                No courses match the selected filters
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

          {/* Course order (right sidebar) */}
          <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-0.5">
              Course Order
              {courseIds.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">{courseIds.length}</span>
              )}
            </h2>
            <p className="text-xs text-gray-400 mb-3">Drag to set the learning sequence</p>

            {courseIds.length === 0 ? (
              <p className="text-xs text-gray-300 text-center py-6 border-2 border-dashed border-gray-100 rounded-lg">
                No courses selected yet
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCourseDragEnd}>
                <SortableContext items={courseIds} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    {courseIds.map((id, idx) => {
                      const course = courses.find(c => c.id === id)
                      if (!course) return null
                      return (
                        <SortableCourseRow
                          key={id}
                          course={course}
                          index={idx}
                          onRemove={() => toggleCourse(id)}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

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
