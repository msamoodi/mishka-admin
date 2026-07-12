"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { withBasePath } from "@/lib/basePath"

type Book = { id: string; title: string; author: string | null; category: string | null; level: string | null }

const CATEGORIES = [
  { value: "product-design",       label: "Product Design" },
  { value: "digital-marketing",    label: "Digital Marketing" },
  { value: "branding-design",      label: "Branding & Design" },
  { value: "user-research",        label: "User Research" },
  { value: "data-and-ai-literacy", label: "Data & AI Literacy" },
]

const LEVELS = [
  { value: "basic",        label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced",     label: "Advanced" },
]

type GeneratedLesson = {
  title: string
  paragraph1: string
  paragraph2: string
  callout: string
}

type GeneratedQuestion = {
  question: string
  options: string[]
  correct_index: number
  explanation: string
}

type GeneratedQuiz = {
  title: string
  after_lesson_index: number
  questions: GeneratedQuestion[]
}

type GeneratedCourse = {
  course_name: string
  description: string
  tags: string[]
  time_to_read: number
  objectives: string[]
  lessons: GeneratedLesson[]
  quizzes: GeneratedQuiz[]
}

// ─── Editable lesson card ─────────────────────────────────────────────────────

function LessonCard({
  lesson, index, onChange,
}: {
  lesson: GeneratedLesson
  index: number
  onChange: (l: GeneratedLesson) => void
}) {
  const [open, setOpen] = useState(index === 0)
  const TA = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
      >
        <span className="text-sm font-semibold text-gray-800">Lesson {index + 1}: {lesson.title}</span>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="p-4 grid gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Title</label>
            <input
              value={lesson.title}
              onChange={e => onChange({ ...lesson, title: e.target.value })}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Paragraph 1</label>
            <textarea rows={5} value={lesson.paragraph1} onChange={e => onChange({ ...lesson, paragraph1: e.target.value })} className={TA} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Paragraph 2</label>
            <textarea rows={4} value={lesson.paragraph2} onChange={e => onChange({ ...lesson, paragraph2: e.target.value })} className={TA} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Callout</label>
            <input
              value={lesson.callout}
              onChange={e => onChange({ ...lesson, callout: e.target.value })}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Editable quiz card ───────────────────────────────────────────────────────

function QuizCard({
  quiz, onChange,
}: {
  quiz: GeneratedQuiz
  onChange: (q: GeneratedQuiz) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-purple-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 hover:bg-purple-100 text-left"
      >
        <span className="text-sm font-semibold text-purple-800">{quiz.title} ({quiz.questions.length} questions)</span>
        <span className="text-purple-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="p-4 grid gap-4">
          {quiz.questions.map((q, qi) => (
            <div key={qi} className="bg-gray-50 rounded-lg p-3 grid gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Question {qi + 1}</label>
                <input
                  value={q.question}
                  onChange={e => {
                    const next = [...quiz.questions]
                    next[qi] = { ...q, question: e.target.value }
                    onChange({ ...quiz, questions: next })
                  }}
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q${qi}-correct`}
                      checked={q.correct_index === oi}
                      onChange={() => {
                        const next = [...quiz.questions]
                        next[qi] = { ...q, correct_index: oi }
                        onChange({ ...quiz, questions: next })
                      }}
                      className="accent-purple-600"
                    />
                    <input
                      value={opt}
                      onChange={e => {
                        const opts = [...q.options]; opts[oi] = e.target.value
                        const next = [...quiz.questions]
                        next[qi] = { ...q, options: opts }
                        onChange({ ...quiz, questions: next })
                      }}
                      className="flex-1 h-8 px-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder={`Option ${oi + 1}`}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Explanation</label>
                <input
                  value={q.explanation}
                  onChange={e => {
                    const next = [...quiz.questions]
                    next[qi] = { ...q, explanation: e.target.value }
                    onChange({ ...quiz, questions: next })
                  }}
                  className="w-full h-8 px-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GenerateClient({ books }: { books: Book[] }) {
  const router = useRouter()

  // Step 1 — settings
  const [selectedBooks,   setSelectedBooks]   = useState<string[]>([])
  const [category,        setCategory]        = useState("product-design")
  const [level,           setLevel]           = useState("basic")
  const [coursePrompt,    setCoursePrompt]    = useState("")
  const [generateImage,   setGenerateImage]   = useState(false)
  const [imagePrompt,     setImagePrompt]     = useState("")
  const [generateAudio,        setGenerateAudio]        = useState(false)
  const [generateLessonImages, setGenerateLessonImages] = useState(false)
  const [lessonImageStyle,     setLessonImageStyle]     = useState("")
  const [thumbnailUrl,         setThumbnailUrl]         = useState<string | null>(null)

  // Step 2 — result
  const [course,    setCourse]    = useState<GeneratedCourse | null>(null)
  const [genCat,    setGenCat]    = useState("")
  const [genLevel,  setGenLevel]  = useState("")

  // UI state
  const [generating, setGenerating] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const filteredBooks = books.filter(b => !b.category || b.category === category)

  const toggleBook = (id: string) =>
    setSelectedBooks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleCategoryChange = (val: string) => {
    setCategory(val)
    setSelectedBooks([])  // clear selection when category changes
  }

  const handleGenerate = async () => {
    if (!selectedBooks.length) { setError("Select at least one book."); return }
    setGenerating(true); setError(null); setCourse(null); setThumbnailUrl(null)
    const res = await fetch(withBasePath("/api/ai/generate-course"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookIds: selectedBooks, category, level,
        additionalInstructions: coursePrompt,
        generateImage,
        imagePrompt: generateImage ? imagePrompt : undefined,
      }),
    })
    const json = await res.json()
    setGenerating(false)
    if (!res.ok) { setError(json.error ?? "Generation failed"); return }
    setCourse(json.course)
    setGenCat(json.category)
    setGenLevel(json.level)
    if (json.thumbnailUrl) setThumbnailUrl(json.thumbnailUrl)
  }

  const handleSave = async () => {
    if (!course) return
    setSaving(true); setError(null)
    const res = await fetch(withBasePath("/api/ai/save-generated-course"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course, category: genCat, level: genLevel, thumbnailUrl, generateAudio, generateLessonImages, lessonImageStyle }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error ?? "Save failed"); return }
    router.push(`/courses/${json.courseId}`)
  }

  // ── Render: review screen ─────────────────────────────────────────────────
  if (course) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Review Generated Course</h2>
            <p className="text-sm text-gray-500 mt-0.5">Edit anything, then save to create the course (saved as draft).</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setCourse(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Regenerate
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-40"
            >
              {saving
                ? (generateAudio || generateLessonImages ? "Saving & generating media…" : "Saving…")
                : "Save Course →"}
            </button>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

        <div className="grid gap-6">
          {/* Course meta */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 grid gap-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Course Details</h3>
            {thumbnailUrl && (
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Generated Thumbnail</label>
                <img src={thumbnailUrl} alt="Course thumbnail" className="w-40 h-40 rounded-xl object-cover border border-gray-200" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Course Name</label>
                <input
                  value={course.course_name}
                  onChange={e => setCourse({ ...course, course_name: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Study Time (minutes)</label>
                <input
                  type="number"
                  value={course.time_to_read}
                  onChange={e => setCourse({ ...course, time_to_read: Number(e.target.value) })}
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
              <textarea
                rows={2}
                value={course.description}
                onChange={e => setCourse({ ...course, description: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Tags</label>
              <input
                value={course.tags.join(", ")}
                onChange={e => setCourse({ ...course, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="tag1, tag2, tag3"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Learning Objectives</label>
              <div className="grid gap-2">
                {course.objectives.map((obj, i) => (
                  <input
                    key={i}
                    value={obj}
                    onChange={e => {
                      const next = [...course.objectives]; next[i] = e.target.value
                      setCourse({ ...course, objectives: next })
                    }}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Lessons & Quizzes interleaved */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Lessons & Quizzes ({course.lessons.length} lessons · {course.quizzes.length} quizzes)
            </h3>
            <div className="grid gap-3">
              {(() => {
                const quizAfter = new Map(course.quizzes.map(q => [q.after_lesson_index, q]))
                const items: React.ReactNode[] = []
                course.lessons.forEach((lesson, i) => {
                  items.push(
                    <LessonCard
                      key={`lesson-${i}`}
                      lesson={lesson}
                      index={i}
                      onChange={updated => {
                        const next = [...course.lessons]; next[i] = updated
                        setCourse({ ...course, lessons: next })
                      }}
                    />
                  )
                  const quiz = quizAfter.get(i)
                  if (quiz) {
                    const qi = course.quizzes.indexOf(quiz)
                    items.push(
                      <QuizCard
                        key={`quiz-${i}`}
                        quiz={quiz}
                        onChange={updated => {
                          const next = [...course.quizzes]; next[qi] = updated
                          setCourse({ ...course, quizzes: next })
                        }}
                      />
                    )
                  }
                })
                return items
              })()}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setCourse(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Regenerate
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save Course →"}
          </button>
        </div>
      </div>
    )
  }

  // ── Render: generation form ───────────────────────────────────────────────
  return (
    <div className="grid gap-6 max-w-2xl">
      {/* Category + Level */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 mb-3">1. Category</h2>
          <div className="grid gap-2">
            {CATEGORIES.map(c => (
              <label
                key={c.value}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                  category === c.value
                    ? "border-gray-900 bg-gray-50 font-medium"
                    : "border-gray-200 hover:bg-gray-50 text-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={c.value}
                  checked={category === c.value}
                  onChange={() => handleCategoryChange(c.value)}
                  className="accent-gray-900"
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-800 mb-3">2. Level</h2>
          <div className="grid gap-2">
            {LEVELS.map(l => (
              <label
                key={l.value}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                  level === l.value
                    ? "border-gray-900 bg-gray-50 font-medium"
                    : "border-gray-200 hover:bg-gray-50 text-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="level"
                  value={l.value}
                  checked={level === l.value}
                  onChange={() => setLevel(l.value)}
                  className="accent-gray-900"
                />
                {l.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Book selection — filtered by selected category */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">3. Select Source Books</h2>
        {filteredBooks.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">
            No books found for this category.{" "}
            <a href="/admin/ai/books" className="text-gray-700 underline">Upload one →</a>
          </p>
        ) : (
          <div className="grid gap-2">
            {filteredBooks.map(b => (
              <label
                key={b.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedBooks.includes(b.id)
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedBooks.includes(b.id)}
                  onChange={() => toggleBook(b.id)}
                  className="mt-0.5 accent-gray-900"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[b.author, b.level ? LEVELS.find(l => l.value === b.level)?.label : null]
                      .filter(Boolean).join(" · ")}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Course Prompt */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">4. Course Prompt <span className="font-normal text-gray-400">(optional)</span></h2>
        <p className="text-xs text-gray-500 mb-3">Guide GPT-4o on tone, structure, and focus. The more specific, the better the result.</p>
        <textarea
          rows={5}
          value={coursePrompt}
          onChange={e => setCoursePrompt(e.target.value)}
          placeholder="e.g. Focus on practical exercises and real-world case studies. Use a conversational, approachable tone. Include actionable takeaways in each lesson. Avoid dense theory."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      {/* Image generation */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">5. Course Thumbnail</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={generateImage}
            onChange={e => setGenerateImage(e.target.checked)}
            className="w-4 h-4 accent-gray-900"
          />
          <span className="text-sm text-gray-700">Generate thumbnail with DALL·E 3</span>
        </label>
        {generateImage && (
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-500 block mb-1">Image style / prompt <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea
              rows={2}
              value={imagePrompt}
              onChange={e => setImagePrompt(e.target.value)}
              placeholder="e.g. Minimalist flat illustration, soft blue tones, abstract shapes representing creativity and design"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>
        )}
      </div>

      {/* Audio narration */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">6. Audio Narration</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={generateAudio}
            onChange={e => setGenerateAudio(e.target.checked)}
            className="w-4 h-4 accent-gray-900"
          />
          <span className="text-sm text-gray-700">Generate audio narration for each lesson (TTS)</span>
        </label>
        {generateAudio && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Audio is generated when saving the course. This adds 1–2 minutes to save time.
          </p>
        )}
      </div>

      {/* Lesson images */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">7. Lesson Cover Images</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={generateLessonImages}
            onChange={e => setGenerateLessonImages(e.target.checked)}
            className="w-4 h-4 accent-gray-900"
          />
          <span className="text-sm text-gray-700">Generate a cover image for each lesson (DALL·E 3)</span>
        </label>
        {generateLessonImages && (
          <div className="mt-3 grid gap-2">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Image style / prompt <span className="font-normal text-gray-400">(optional)</span></label>
              <textarea
                rows={2}
                value={lessonImageStyle}
                onChange={e => setLessonImageStyle(e.target.value)}
                placeholder="e.g. Minimalist flat illustration, warm earth tones, simple geometric shapes — consistent visual style across all lessons"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              One image per lesson generated at save time. Adds ~1–2 min and ~$0.50 for a 10-lesson course.
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={generating || !selectedBooks.length}
        className="px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors"
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating…{generateImage ? " (60–90 sec)" : " (30–60 sec)"}
          </span>
        ) : "Generate Course →"}
      </button>
    </div>
  )
}
