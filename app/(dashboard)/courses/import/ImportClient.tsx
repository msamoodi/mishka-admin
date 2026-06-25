"use client"
import { useState } from "react"
import { withBasePath } from "@/lib/basePath"

const EXAMPLE = [
  {
    course_name: "Foundations of Human-Centered Design",
    slug: "foundations-of-hcd",
    category: "product-design",
    level: "basic",
    description: "Learn the core principles of designing around real user needs.",
    time_to_read: 30,
    display_order: 0,
    tags: ["design", "ux"],
    thumbnail_url: "/images/courses/product-design/thumbnail.png",
    is_published: true,
    objectives: [
      "Understand the role of product design in digital products",
      "Learn core principles: usability, aesthetics, and problem-solving",
    ],
    lessons: [
      {
        lesson_type: "content",
        title: "What Is Human-Centered Design?",
        is_published: true,
        paragraph1: "Human-centered design starts with empathy for the people you're designing for.",
        image: "/images/lessons/hcd-intro.png",
        paragraph2: "It's an iterative process: understand, ideate, prototype, test.",
        callout: "Tip: always validate assumptions with real users.",
        audio: "/audio/lessons/hcd-intro.mp3",
      },
      {
        lesson_type: "quiz",
        title: "Quick Check",
        is_published: true,
        questions: [
          {
            question: "What is the first step in human-centered design?",
            options: ["Build a prototype", "Understand the user", "Write code", "Launch the product"],
            correct_index: 1,
            explanation: "Empathy and understanding the user always comes first.",
          },
        ],
      },
    ],
  },
]

type ResultRow = { slug: string; ok: boolean; error?: string; courseId?: string }

export default function ImportClient() {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ResultRow[] | null>(null)
  const [error, setError] = useState("")

  const loadExample = () => {
    setText(JSON.stringify(EXAMPLE, null, 2))
    setResults(null)
    setError("")
  }

  const handleImport = async () => {
    setError("")
    setResults(null)

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      setError("That's not valid JSON — check for missing commas or quotes.")
      return
    }

    const courses = Array.isArray(parsed) ? parsed : [parsed]
    if (courses.length === 0) {
      setError("Provide at least one course.")
      return
    }

    setLoading(true)
    const res = await fetch(withBasePath("/api/admin/bulk-import-courses"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courses }),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok || json.error) {
      setError(json.error ?? "Import failed")
      return
    }

    setResults(json.results)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Courses JSON</label>
          <button
            type="button"
            onClick={loadExample}
            className="h-7 px-3 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Load Example
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={20}
          spellCheck={false}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 resize-y"
          placeholder='[{ "course_name": "...", "slug": "...", "lessons": [...] }]'
        />
        <p className="text-xs text-gray-400">
          A course with a slug that already exists will be updated — its objectives, lessons, and quiz questions are fully replaced with what you provide.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <button
        type="button"
        onClick={handleImport}
        disabled={loading || !text.trim()}
        className="self-start h-10 px-5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {loading ? "Importing…" : "Import Courses"}
      </button>

      {results && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.slug} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.slug}</td>
                  <td className="px-4 py-3">
                    {r.ok ? (
                      <span className="text-green-600 font-medium">✓ Imported</span>
                    ) : (
                      <span className="text-red-600">{r.error}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
