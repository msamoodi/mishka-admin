"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentBlock = { type: "paragraph" | "heading" | "bullet"; text: string }

type QuizQuestion = {
  id?: string
  question: string
  options: string[]       // exactly 4 options
  correct_index: number
  explanation: string
  order_index: number
}

type Lesson = {
  id?: string
  title: string
  lesson_type: string
  content: ContentBlock[]
  order_index: number
}

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  courseId: string
  lessonType: string
  defaultOrderIndex: number
  initial?: Lesson
  initialQuizQuestions?: QuizQuestion[]
}

// ─── Content block editor ────────────────────────────────────────────────────

function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: ContentBlock[]
  onChange: (b: ContentBlock[]) => void
}) {
  const add = (type: ContentBlock["type"]) =>
    onChange([...blocks, { type, text: "" }])

  const update = (i: number, text: string) =>
    onChange(blocks.map((b, idx) => (idx === i ? { ...b, text } : b)))

  const remove = (i: number) => onChange(blocks.filter((_, idx) => idx !== i))

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  const BLOCK_STYLE: Record<ContentBlock["type"], string> = {
    heading:   "font-bold text-gray-900",
    paragraph: "text-gray-700",
    bullet:    "text-gray-700 before:content-['•'] before:mr-2",
  }

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, i) => (
        <div key={i} className="flex gap-2 items-start group">
          <div className="flex flex-col gap-0.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => move(i, -1)} className="text-gray-400 hover:text-gray-700 text-xs leading-none px-1">▲</button>
            <button type="button" onClick={() => move(i, 1)}  className="text-gray-400 hover:text-gray-700 text-xs leading-none px-1">▼</button>
          </div>
          <span className="text-xs text-gray-400 pt-2.5 w-16 shrink-0 capitalize">{b.type}</span>
          <textarea
            value={b.text}
            onChange={(e) => update(i, e.target.value)}
            rows={b.type === "paragraph" ? 3 : 1}
            className={`flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none ${BLOCK_STYLE[b.type]}`}
            placeholder={b.type === "heading" ? "Section heading…" : b.type === "bullet" ? "Bullet point…" : "Paragraph text…"}
          />
          <button type="button" onClick={() => remove(i)} className="pt-2 text-gray-300 hover:text-red-500 transition-colors text-xs">✕</button>
        </div>
      ))}

      <div className="flex gap-2 mt-1">
        {(["heading", "paragraph", "bullet"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => add(t)}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors capitalize"
          >
            + {t}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Quiz question editor ─────────────────────────────────────────────────────

function QuestionEditor({
  q,
  index,
  onChange,
  onRemove,
  onMove,
  total,
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
                  const next = [...q.options]
                  next[oi] = e.target.value
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

  const [title,      setTitle]      = useState(initial?.title      ?? "")
  const [orderIndex, setOrderIndex] = useState(initial?.order_index ?? defaultOrderIndex)
  const [blocks,     setBlocks]     = useState<ContentBlock[]>(
    lessonType === "content" ? ((initial?.content as ContentBlock[]) ?? []) : []
  )
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
  const [error,   setError]   = useState("")

  const addQuestion = () =>
    setQuestions((qs) => [
      ...qs,
      { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "", order_index: qs.length },
    ])

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
    if (!title.trim()) { setError("Title is required."); return }
    if (lessonType === "quiz" && questions.length === 0) { setError("Add at least one question."); return }
    setLoading(true)
    setError("")

    const supabase = createClient()
    let lessonId = initial?.id

    const lessonPayload = {
      course_id:   courseId,
      title:       title.trim(),
      lesson_type: lessonType,
      content:     lessonType === "content" ? blocks : [],
      order_index: orderIndex,
    }

    if (isEdit) {
      const { error: err } = await supabase.from("lessons").update(lessonPayload).eq("id", lessonId!)
      if (err) { setError(err.message); setLoading(false); return }
    } else {
      const { data, error: err } = await supabase.from("lessons").insert(lessonPayload).select("id").single()
      if (err || !data) { setError(err?.message ?? "Failed to create lesson"); setLoading(false); return }
      lessonId = data.id
    }

    // Quiz questions: delete all then re-insert (simplest approach for reordering)
    if (lessonType === "quiz") {
      await supabase.from("quiz_questions").delete().eq("lesson_id", lessonId!)
      const qRows = questions.map((q, i) => ({
        course_id:     courseId,
        lesson_id:     lessonId!,
        question:      q.question.trim(),
        options:       q.options,
        correct_index: q.correct_index,
        explanation:   q.explanation.trim(),
        order_index:   i,
      }))
      const { error: qErr } = await supabase.from("quiz_questions").insert(qRows)
      if (qErr) { setError(qErr.message); setLoading(false); return }
    }

    router.push(`/admin/courses/${courseId}/lessons`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl flex flex-col gap-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder={lessonType === "quiz" ? "Quiz title…" : "Lesson title…"}
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

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
            lessonType === "quiz" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
          }`}>
            {lessonType === "quiz" ? "Quiz" : "Content Lesson"}
          </span>
        </div>
      </div>

      {/* Content editor */}
      {lessonType === "content" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Content Blocks</h2>
          <BlockEditor blocks={blocks} onChange={setBlocks} />
        </div>
      )}

      {/* Quiz editor */}
      {lessonType === "quiz" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Questions ({questions.length})</h2>
            <button
              type="button"
              onClick={addQuestion}
              className="h-8 px-3 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              + Add Question
            </button>
          </div>
          {questions.map((q, i) => (
            <QuestionEditor
              key={i}
              q={q}
              index={i}
              total={questions.length}
              onChange={(q) => updateQuestion(i, q)}
              onRemove={() => removeQuestion(i)}
              onMove={(dir) => moveQuestion(i, dir)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="h-9 px-5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving…" : isEdit ? "Save Changes" : lessonType === "quiz" ? "Create Quiz" : "Create Lesson"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/admin/courses/${courseId}/lessons`)}
          className="h-9 px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
