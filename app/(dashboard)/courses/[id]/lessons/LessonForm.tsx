"use client"
import { withBasePath } from "@/lib/basePath"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Toast, type ToastState } from "@/components/Toast"
import FolderImagePicker from "@/components/FolderImagePicker"
import FolderAudioPicker from "@/components/FolderAudioPicker"
import FolderVideoPicker from "@/components/FolderVideoPicker"

// ─── Types ────────────────────────────────────────────────────────────────────

type QuizQuestion = {
  id?: string
  question: string
  options: string[]
  correct_index: number
  explanation: string
  order_index: number
}

type Lesson = {
  id?: string
  title: string
  lesson_type: string
  order_index: number
  cover_image_url?: string | null
  paragraph1?: string | null
  image?: string | null
  paragraph2?: string | null
  callout?: string | null
  audio?: string | null
  video_url?: string | null
  is_published?: boolean | null
}

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  courseId: string
  lessonType: string
  defaultOrderIndex: number
  initial?: Lesson
  initialQuizQuestions?: QuizQuestion[]
}

// ─── Quiz question editor ─────────────────────────────────────────────────────

function QuestionEditor({
  q, index, onChange, onRemove, onMove, total,
}: {
  q: QuizQuestion
  index: number
  onChange: (q: QuizQuestion) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  total: number
}) {
  const INPUT = "w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Question {index + 1}</span>
        <div className="flex items-center gap-1">
          {index > 0         && <button type="button" onClick={() => onMove(-1)} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1">▲</button>}
          {index < total - 1 && <button type="button" onClick={() => onMove(1)}  className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1">▼</button>}
          <button type="button" onClick={onRemove} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 ml-1">Remove</button>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Question</label>
        <input value={q.question} onChange={(e) => onChange({ ...q, question: e.target.value })} className={INPUT} placeholder="What is…?" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Options — click the radio to mark the correct answer</label>
        <div className="flex flex-col gap-1.5">
          {q.options.map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${index}`}
                checked={q.correct_index === oi}
                onChange={() => onChange({ ...q, correct_index: oi })}
                className="w-4 h-4 accent-green-600"
              />
              <input
                value={opt}
                onChange={(e) => {
                  const next = [...q.options]; next[oi] = e.target.value
                  onChange({ ...q, options: next })
                }}
                className={INPUT}
                placeholder={`Option ${oi + 1}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Explanation (shown after answering)</label>
        <input value={q.explanation} onChange={(e) => onChange({ ...q, explanation: e.target.value })} className={INPUT} placeholder="Because…" />
      </div>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function LessonForm({ courseId, lessonType, defaultOrderIndex, initial, initialQuizQuestions = [] }: Props) {
  const router = useRouter()
  const isEdit = !!initial?.id

  const [title,         setTitle]         = useState(initial?.title ?? "")
  const [orderIndex,    setOrderIndex]    = useState(initial?.order_index ?? defaultOrderIndex)
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.cover_image_url ?? "")
  const [paragraph1,    setParagraph1]    = useState(initial?.paragraph1 ?? "")
  const [image,         setImage]         = useState(initial?.image ?? "")
  const [paragraph2,    setParagraph2]    = useState(initial?.paragraph2 ?? "")
  const [callout,       setCallout]       = useState(initial?.callout ?? "")
  const [audio,         setAudio]         = useState(initial?.audio ?? "")
  const [videoUrl,      setVideoUrl]      = useState(initial?.video_url ?? "")
  const [isPublished,   setIsPublished]   = useState(initial?.is_published ?? true)
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialQuizQuestions.length > 0
      ? initialQuizQuestions.map((q) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : Object.values(q.options),
        }))
      : lessonType === "quiz"
        ? [{ question: "", options: ["", "", "", ""], correct_index: 0, explanation: "", order_index: 0 }]
        : []
  )
  const [loading, setLoading] = useState(false)
  const [toast,   setToast]   = useState<ToastState>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const addQuestion = () =>
    setQuestions((qs) => [...qs, { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "", order_index: qs.length }])

  const updateQuestion = (i: number, q: QuizQuestion) =>
    setQuestions((qs) => qs.map((x, idx) => (idx === i ? q : x)))

  const removeQuestion = (i: number) =>
    setQuestions((qs) => qs.filter((_, idx) => idx !== i).map((q, idx) => ({ ...q, order_index: idx })))

  const moveQuestion = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= questions.length) return
    const next = [...questions]
    ;[next[i], next[j]] = [next[j], next[i]]
    setQuestions(next.map((q, idx) => ({ ...q, order_index: idx })))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setToast({ message: "Title is required.", type: "error" }); return }
    if (lessonType === "quiz" && questions.length === 0) { setToast({ message: "Add at least one question.", type: "error" }); return }
    if (lessonType === "video" && !videoUrl.trim()) { setToast({ message: "Choose a video file.", type: "error" }); return }
    setLoading(true)

    const res  = await fetch(withBasePath("/api/admin/save-lesson"), {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId:        initial?.id,
        courseId,
        lessonType,
        title:           title.trim(),
        cover_image_url: coverImageUrl,
        paragraph1,
        image,
        paragraph2,
        callout,
        audio,
        video_url:       videoUrl,
        order_index:     orderIndex,
        is_published:    isPublished,
        questions:       lessonType === "quiz" ? questions : undefined,
      }),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok || json.error) {
      setToast({ message: json.error || "Save failed", type: "error" })
      return
    }

    setToast({ message: isEdit ? "Lesson saved successfully" : "Lesson created successfully", type: "success" })
    router.refresh()
  }

  return (
    <>
    <Toast toast={toast} onClose={closeToast} />
    <form onSubmit={handleSubmit} className="max-w-2xl flex flex-col gap-5">

      {/* Title + order */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder={lessonType === "quiz" ? "Quiz title…" : lessonType === "video" ? "Video title…" : "Lesson title…"}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Order</label>
            <input
              type="number" min={0} value={orderIndex}
              onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
              className="h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>
        <div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
            lessonType === "quiz" ? "bg-amber-50 text-amber-700" : lessonType === "video" ? "bg-pink-50 text-pink-700" : "bg-blue-50 text-blue-700"
          }`}>
            {lessonType === "quiz" ? "Quiz" : lessonType === "video" ? "Video" : "Content Lesson"}
          </span>
        </div>
      </div>

      {/* Video field */}
      {lessonType === "video" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Video</h2>
          <FolderVideoPicker value={videoUrl} onChange={setVideoUrl} placeholder="/videos/lessons/intro.mp4" />
        </div>
      )}

      {/* Content fields — these map 1:1 to the lessons table columns the app reads */}
      {lessonType === "content" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-700">Content</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Cover Image</label>
            <FolderImagePicker value={coverImageUrl} onChange={setCoverImageUrl} placeholder="/images/lessons/cover.png" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Paragraph 1</label>
            <textarea
              value={paragraph1}
              onChange={(e) => setParagraph1(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              placeholder="First paragraph of the lesson…"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Image</label>
            <FolderImagePicker value={image} onChange={setImage} placeholder="/images/lessons/diagram.png" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Paragraph 2</label>
            <textarea
              value={paragraph2}
              onChange={(e) => setParagraph2(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              placeholder="Second paragraph of the lesson…"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Callout</label>
            <textarea
              value={callout}
              onChange={(e) => setCallout(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              placeholder="Tip / note shown in a highlighted box…"
            />
          </div>
        </div>
      )}

      {/* Audio — available for both content and quiz lessons (videos carry their own audio track) */}
      {lessonType !== "video" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Audio narration</h2>
          <FolderAudioPicker value={audio} onChange={setAudio} placeholder="/audio/lessons/narration.mp3" />
        </div>
      )}

      {/* Quiz questions */}
      {lessonType === "quiz" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Questions ({questions.length})</h2>
            <button type="button" onClick={addQuestion} className="h-8 px-3 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
              + Add Question
            </button>
          </div>
          {questions.map((q, i) => (
            <QuestionEditor
              key={i} q={q} index={i} total={questions.length}
              onChange={(q) => updateQuestion(i, q)}
              onRemove={() => removeQuestion(i)}
              onMove={(dir) => moveQuestion(i, dir)}
            />
          ))}
        </div>
      )}

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 accent-gray-900"
        />
        <span className="text-sm font-medium text-gray-700">Published (visible to learners)</span>
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading} className="h-9 px-5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {loading ? "Saving…" : isEdit ? "Save Changes" : lessonType === "quiz" ? "Create Quiz" : lessonType === "video" ? "Create Video" : "Create Lesson"}
        </button>
        <button type="button" onClick={() => router.push(`/courses/${courseId}/lessons`)} className="h-9 px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </form>
    </>
  )
}
