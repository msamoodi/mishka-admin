"use client"
import { useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import CourseForm, { type CourseFormHandle } from "../CourseForm"
import { Toast, type ToastState } from "@/components/Toast"

export default function NewCourseClient() {
  const router    = useRouter()
  const courseRef = useRef<CourseFormHandle>(null)
  const [saving,  setSaving] = useState(false)
  const [toast,   setToast]  = useState<ToastState>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const handleCreate = async () => {
    setSaving(true)
    const result = await courseRef.current?.save()
    setSaving(false)

    if (!result?.ok) {
      setToast({ message: result?.error ?? "Failed to create course", type: "error" })
      return
    }

    // Redirect to the edit page where lessons & quizzes can be added
    router.push(`/admin/courses/${result.id}`)
  }

  return (
    <>
      <Toast toast={toast} onClose={closeToast} />

      <CourseForm ref={courseRef} />

      <p className="mt-4 text-xs text-gray-400">
        Save the course first — you'll be able to add lessons and quizzes on the next page.
      </p>

      {/* ── Bottom action bar ───────────────────────────────────── */}
      <div className="mt-6 pt-5 border-t border-gray-200 flex justify-end">
        <button
          type="button"
          onClick={handleCreate}
          disabled={saving}
          className="h-10 px-6 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "Creating…" : "Create Course"}
        </button>
      </div>
    </>
  )
}
