"use client"
import { useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import CourseForm, { type CourseFormHandle } from "../CourseForm"
import ContentManager, { type ContentManagerHandle } from "./ContentManager"
import { Toast, type ToastState } from "@/components/Toast"

type ActiveInfo = { active: boolean; canDelete: boolean }

export default function CourseEditClient({
  courseId,
  course,
  lessons,
  quizQuestions,
}: {
  courseId: string
  course: Record<string, unknown>
  lessons: any[]
  quizQuestions: any[]
}) {
  const router = useRouter()
  const courseRef  = useRef<CourseFormHandle>(null)
  const contentRef = useRef<ContentManagerHandle>(null)

  const [saving,        setSaving]        = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [toast,         setToast]         = useState<ToastState>(null)
  const [activeInfo,    setActiveInfo]    = useState<ActiveInfo>({ active: false, canDelete: false })

  const closeToast = useCallback(() => setToast(null), [])

  const handleActiveChange = useCallback((info: ActiveInfo) => {
    setActiveInfo(info)
    setConfirmDelete(false)
  }, [])

  const handleSaveAll = async () => {
    setSaving(true)

    // 1. Save course details
    const courseResult = await courseRef.current?.save()
    if (!courseResult?.ok) {
      setToast({ message: courseResult?.error || "Failed to save course", type: "error" })
      setSaving(false)
      return
    }

    // 2. Save all dirty lessons / quizzes
    const lessonResult = await contentRef.current?.saveAllLessons()
    if (lessonResult && !lessonResult.ok) {
      setToast({ message: lessonResult.error || "Failed to save lessons", type: "error" })
      setSaving(false)
      return
    }

    setSaving(false)
    setToast({ message: "All changes saved", type: "success" })
    router.refresh()
  }

  const handleDelete = async () => {
    setDeleting(true)
    const result = await contentRef.current?.deleteLesson()
    setDeleting(false)
    if (!result?.ok) {
      setToast({ message: result?.error || "Delete failed", type: "error" })
      return
    }
    setConfirmDelete(false)
    setToast({ message: "Lesson deleted", type: "success" })
    router.refresh()
  }

  return (
    <>
      <Toast toast={toast} onClose={closeToast} />

      <CourseForm ref={courseRef} initial={course as any} />

      <ContentManager
        ref={contentRef}
        courseId={courseId}
        initialLessons={lessons}
        initialQuizQuestions={quizQuestions}
        onActiveChange={handleActiveChange}
      />

      {/* ── Bottom action bar ─────────────────────────────────────────────── */}
      <div className="mt-8 pt-5 border-t border-gray-200">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Delete lesson — only when an existing (saved) lesson is active */}
          {activeInfo.canDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl">
                <span className="text-xs text-red-700 font-medium">Delete this lesson?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="h-7 px-3 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "…" : "Yes, delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="h-7 px-3 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="h-9 px-4 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
              >
                Delete lesson
              </button>
            )
          )}

          <div className="flex-1" />

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="h-10 px-6 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  )
}
