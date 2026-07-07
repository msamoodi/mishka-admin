"use client"
import { withBasePath } from "@/lib/basePath"
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react"
import ImageUploader from "@/components/ImageUploader"
import AudioUploader from "@/components/AudioUploader"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// ─── Types ───────────────────────────────────────────────────────────────────

type Lesson = {
  id:           string
  title:        string
  lesson_type:  "content" | "quiz"
  paragraph1?:  string | null
  image?:       string | null
  paragraph2?:  string | null
  callout?:     string | null
  audio?:       string | null
  is_published?: boolean
  order_index:  number
}

type QuizQuestion = {
  id:            string
  lesson_id:     string
  question:      string
  options:       string[]
  correct_index: number
  explanation:   string
  order_index:   number
}

type LessonDraft = {
  lessonId:     string | null
  formType:     "content" | "quiz"
  title:        string
  paragraph1:   string
  imageUrl:     string
  paragraph2:   string
  callout:      string
  audioUrl:     string
  question:     string
  options:      [string, string, string, string]
  correctIndex: number
  isPublished:  boolean
}

export type ContentManagerHandle = {
  saveAllLessons:  () => Promise<{ ok: boolean; error?: string }>
  deleteLesson:    () => Promise<{ ok: boolean; error?: string }>
  hasActiveLesson: () => boolean
  canDeleteLesson: () => boolean
}

const isNewKey = (k: string) => k.startsWith("__new__")
const makeNewKey = () => `__new__${Date.now()}`

// ─── Init drafts from flat DB columns ─────────────────────────────────────────

function initDrafts(lessons: Lesson[], questions: QuizQuestion[]): Record<string, LessonDraft> {
  const map: Record<string, LessonDraft> = {}
  for (const l of lessons) {
    const q = questions
      .filter(q => q.lesson_id === l.id)
      .sort((a, b) => a.order_index - b.order_index)[0]
    map[l.id] = {
      lessonId:     l.id,
      formType:     l.lesson_type,
      title:        l.title,
      paragraph1:   l.paragraph1  ?? "",
      imageUrl:     l.image       ?? "",
      paragraph2:   l.paragraph2  ?? "",
      callout:      l.callout     ?? "",
      audioUrl:     l.audio       ?? "",
      question:     q?.question   ?? "",
      options:      (Array.isArray(q?.options) ? q.options.slice(0, 4) : ["", "", "", ""]) as [string,string,string,string],
      correctIndex: q?.correct_index ?? 0,
      isPublished:  l.is_published   ?? false,
    }
  }
  return map
}

// ─── Sortable row ────────────────────────────────────────────────────────────

function SortableLesson({
  lesson,
  isActive,
  isDirty,
  draftTitle,
  onClick,
}: {
  lesson: Lesson
  isActive: boolean
  isDirty: boolean
  draftTitle: string
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-1">
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex items-center justify-center px-1.5 rounded-lg text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
          <circle cx="3" cy="3"  r="1.5" /><circle cx="9" cy="3"  r="1.5" />
          <circle cx="3" cy="9"  r="1.5" /><circle cx="9" cy="9"  r="1.5" />
          <circle cx="3" cy="15" r="1.5" /><circle cx="9" cy="15" r="1.5" />
        </svg>
      </button>

      {/* Row button */}
      <button
        type="button"
        onClick={onClick}
        className={`flex flex-1 items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
          isActive ? "bg-gray-900 text-white" : "bg-white border border-gray-200 hover:bg-gray-50 text-gray-800"
        }`}
      >
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
          lesson.lesson_type === "quiz"
            ? isActive ? "bg-amber-400 text-amber-900" : "bg-amber-50 text-amber-700"
            : isActive ? "bg-blue-400 text-blue-900"  : "bg-blue-50 text-blue-700"
        }`}>
          {lesson.lesson_type === "quiz" ? "Quiz" : "Lesson"}
        </span>
        <span className="flex-1 text-sm truncate">
          {isDirty && draftTitle ? draftTitle : lesson.title}
        </span>
        {isDirty
          ? <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isActive ? "bg-white/20 text-white" : "bg-amber-50 text-amber-600"}`}>edited</span>
          : <span className={`text-xs ${isActive ? "opacity-60" : "opacity-40"}`}>{lesson.is_published ? "Published" : "Draft"}</span>
        }
      </button>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

const ContentManager = forwardRef<
  ContentManagerHandle,
  {
    courseId: string
    courseCategory: string
    courseSlug: string
    initialLessons: Lesson[]
    initialQuizQuestions: QuizQuestion[]
    onActiveChange?: (info: { active: boolean; canDelete: boolean }) => void
  }
>(function ContentManager({ courseId, courseCategory, courseSlug, initialLessons, initialQuizQuestions, onActiveChange }, ref) {
  const mediaFolder = `courses/${courseCategory}/${courseSlug}`

  const [lessons,   setLessons]   = useState<Lesson[]>(initialLessons)
  const [drafts,    setDrafts]    = useState<Record<string, LessonDraft>>(() =>
    initDrafts(initialLessons, initialQuizQuestions)
  )
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [showForm,  setShowForm]  = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setLessons(prev => {
      const sorted = [...prev].sort((a, b) => a.order_index - b.order_index)
      const oldIdx = sorted.findIndex(l => l.id === active.id)
      const newIdx = sorted.findIndex(l => l.id === over.id)
      const reordered = arrayMove(sorted, oldIdx, newIdx).map((l, i) => ({ ...l, order_index: i }))
      // Persist in background
      fetch(withBasePath("/api/admin/reorder-lessons"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: reordered.map(l => ({ id: l.id, order_index: l.order_index })) }),
      })
      return reordered
    })
  }, [])

  // Stable refs so the imperative handle always sees latest values
  const draftsRef    = useRef(drafts);    useEffect(() => { draftsRef.current    = drafts    }, [drafts])
  const dirtyRef     = useRef(dirtyKeys); useEffect(() => { dirtyRef.current     = dirtyKeys }, [dirtyKeys])
  const lessonsRef   = useRef(lessons);   useEffect(() => { lessonsRef.current   = lessons   }, [lessons])
  const activeKeyRef = useRef(activeKey); useEffect(() => { activeKeyRef.current = activeKey }, [activeKey])

  // Notify parent on active-state change
  useEffect(() => {
    onActiveChange?.({
      active:    showForm,
      canDelete: showForm && !!activeKey && !isNewKey(activeKey),
    })
  }, [showForm, activeKey, onActiveChange])

  // ── Draft helpers ────────────────────────────────────────────────────────

  const updateDraft = useCallback(<K extends keyof LessonDraft>(key: K, value: LessonDraft[K]) => {
    setDrafts(prev => {
      const k = activeKeyRef.current
      if (!k) return prev
      return { ...prev, [k]: { ...prev[k], [key]: value } }
    })
    setDirtyKeys(prev => {
      const k = activeKeyRef.current
      if (!k) return prev
      return new Set(prev).add(k)
    })
  }, [])

  const cur = activeKey ? drafts[activeKey] : null

  // ── Lesson list actions ──────────────────────────────────────────────────

  const openLesson = (id: string) => { setActiveKey(id); setShowForm(true) }

  const handleAddNew = () => {
    const key = makeNewKey()
    setDrafts(prev => ({
      ...prev,
      [key]: {
        lessonId: null, formType: "content",
        title: "", paragraph1: "", imageUrl: "", paragraph2: "", callout: "", audioUrl: "",
        question: "", options: ["", "", "", ""], correctIndex: 0, isPublished: false,
      },
    }))
    setActiveKey(key)
    setShowForm(true)
    setDirtyKeys(prev => new Set(prev).add(key))
  }



  const handleClose = () => { setShowForm(false); setActiveKey(null) }

  // ── Imperative handle ────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    hasActiveLesson: () => showForm && !!activeKeyRef.current,
    canDeleteLesson: () => showForm && !!activeKeyRef.current && !isNewKey(activeKeyRef.current),

    async saveAllLessons() {
      const keys = [...dirtyRef.current].filter(k => draftsRef.current[k]?.title.trim())
      for (const key of keys) {
        const d = draftsRef.current[key]
        const existing = lessonsRef.current.find(l => l.id === d.lessonId)
        const body: Record<string, unknown> = {
          lessonId:     d.lessonId ?? undefined,
          courseId,
          lessonType:   d.formType,
          title:        d.title.trim(),
          paragraph1:   d.paragraph1,
          image:        d.imageUrl,
          paragraph2:   d.paragraph2,
          callout:      d.callout,
          audio:        d.audioUrl,
          is_published: d.isPublished,
          order_index:  existing?.order_index ?? lessonsRef.current.length,
        }
        if (d.formType === "quiz") {
          body.questions = [{
            question: d.question.trim(), options: d.options,
            correct_index: d.correctIndex, explanation: "", order_index: 0,
          }]
        }

        const res  = await fetch(withBasePath("/api/admin/save-lesson"), {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!res.ok || json.error) return { ok: false, error: json.error || "Save failed" }

        const savedId = json.lessonId as string
        if (isNewKey(key)) {
          setDrafts(prev => {
            const { [key]: nd, ...rest } = prev
            return { ...rest, [savedId]: { ...nd, lessonId: savedId } }
          })
          setLessons(prev => [...prev, {
            id: savedId, title: d.title.trim(), lesson_type: d.formType,
            paragraph1: d.paragraph1, image: d.imageUrl, paragraph2: d.paragraph2,
            callout: d.callout, audio: d.audioUrl,
            is_published: d.isPublished, order_index: lessonsRef.current.length,
          }])
          if (activeKeyRef.current === key) setActiveKey(savedId)
        } else {
          setLessons(prev => prev.map(l =>
            l.id === d.lessonId
              ? { ...l, title: d.title.trim(), lesson_type: d.formType,
                  paragraph1: d.paragraph1, image: d.imageUrl, paragraph2: d.paragraph2,
                  callout: d.callout, audio: d.audioUrl,
                  is_published: d.isPublished }
              : l
          ))
        }
      }
      setDirtyKeys(new Set())
      return { ok: true }
    },

    async deleteLesson() {
      const key = activeKeyRef.current
      if (!key) return { ok: false, error: "No lesson selected" }
      if (isNewKey(key)) {
        setDrafts(prev => { const { [key]: _, ...rest } = prev; return rest })
        setDirtyKeys(prev => { const n = new Set(prev); n.delete(key); return n })
        setActiveKey(null); setShowForm(false)
        return { ok: true }
      }
      const lessonId = draftsRef.current[key]?.lessonId
      if (!lessonId) return { ok: false, error: "No lesson ID" }
      const res  = await fetch(withBasePath("/api/admin/delete-lesson"), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lessonId }),
      })
      const json = await res.json()
      if (!res.ok || json.error) return { ok: false, error: json.error || "Delete failed" }
      setDrafts(prev => { const { [key]: _, ...rest } = prev; return rest })
      setDirtyKeys(prev => { const n = new Set(prev); n.delete(key); return n })
      setLessons(prev => prev.filter(l => l.id !== lessonId))
      setActiveKey(null); setShowForm(false)
      return { ok: true }
    },
  }), [showForm, courseId])

  // ── Styles ───────────────────────────────────────────────────────────────

  const TA    = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
  const INPUT = "w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"

  // ── Render ────────────────────────────────────────────────────────────────

  const sortedLessons = [...lessons].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="mt-8">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Lessons & Quizzes</h2>

      {/* Lesson list */}
      {(lessons.length > 0 || Object.keys(drafts).some(isNewKey)) && (
        <div className="flex flex-col gap-1 mb-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedLessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
              {sortedLessons.map(l => (
                <SortableLesson
                  key={l.id}
                  lesson={l}
                  isActive={activeKey === l.id}
                  isDirty={dirtyKeys.has(l.id)}
                  draftTitle={drafts[l.id]?.title ?? ""}
                  onClick={() => openLesson(l.id)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Unsaved new lessons */}
          {Object.keys(drafts).filter(isNewKey).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => { setActiveKey(key); setShowForm(true) }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                activeKey === key ? "bg-gray-900 text-white" : "bg-white border border-dashed border-gray-300 hover:bg-gray-50 text-gray-500"
              }`}
            >
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${activeKey === key ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-500"}`}>New</span>
              <span className="flex-1 text-sm truncate italic">{drafts[key]?.title.trim() || "Untitled…"}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${activeKey === key ? "bg-white/20 text-white" : "bg-amber-50 text-amber-600"}`}>unsaved</span>
            </button>
          ))}
        </div>
      )}

      {/* Add new button — always visible */}
      <button
        type="button"
        onClick={handleAddNew}
        className="flex items-center gap-2 h-10 px-4 text-sm font-medium text-gray-700 bg-white border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors w-full justify-center mb-4"
      >
        + Add new content
      </button>

      {/* Form */}
      {showForm && cur && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">

          {/* Type tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
            {(["content", "quiz"] as const).map(t => (
              <button key={t} type="button" onClick={() => updateDraft("formType", t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${cur.formType === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {t === "content" ? "Lesson" : "Quiz"}
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Title</label>
            <input value={cur.title} onChange={e => updateDraft("title", e.target.value)} className={INPUT}
              placeholder={cur.formType === "quiz" ? "Quiz title…" : "Lesson title…"} />
          </div>

          {/* Lesson content */}
          {cur.formType === "content" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Paragraph 1</label>
                <textarea value={cur.paragraph1} onChange={e => updateDraft("paragraph1", e.target.value)} rows={3} className={TA} placeholder="First paragraph…" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Image</label>
                <ImageUploader value={cur.imageUrl} onChange={v => updateDraft("imageUrl", v)} placeholder="/images/courses/…" folder={mediaFolder} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Paragraph 2</label>
                <textarea value={cur.paragraph2} onChange={e => updateDraft("paragraph2", e.target.value)} rows={3} className={TA} placeholder="Second paragraph…" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Callout</label>
                <textarea value={cur.callout} onChange={e => updateDraft("callout", e.target.value)} rows={2}
                  className={`${TA} bg-amber-50 border-amber-200 text-amber-900`} placeholder="Highlighted note or tip…" />
              </div>
            </>
          )}

          {/* Quiz content */}
          {cur.formType === "quiz" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Question</label>
                <input value={cur.question} onChange={e => updateDraft("question", e.target.value)} className={INPUT} placeholder="What is…?" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Options — mark the correct answer</label>
                {cur.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input type="radio" name={`correct-${activeKey}`} checked={cur.correctIndex === i}
                      onChange={() => updateDraft("correctIndex", i)} className="w-4 h-4 accent-green-600 shrink-0" />
                    <input value={opt} onChange={e => {
                      const next = [...cur.options] as [string,string,string,string]
                      next[i] = e.target.value; updateDraft("options", next)
                    }} className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder={`Option ${i + 1}`} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Audio — shared by both content and quiz */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Audio (MP3)</label>
            <AudioUploader value={cur.audioUrl} onChange={v => updateDraft("audioUrl", v)} placeholder="/audio/…" folder={mediaFolder} />
          </div>

          {/* Published + close */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={cur.isPublished} onChange={e => updateDraft("isPublished", e.target.checked)}
                className="w-4 h-4 rounded accent-gray-900" />
              <span className="text-sm text-gray-600">Published</span>
            </label>
            <button type="button" onClick={handleClose} className="text-xs text-gray-400 hover:text-gray-700">Close</button>
          </div>
        </div>
      )}
    </div>
  )
})

export default ContentManager
