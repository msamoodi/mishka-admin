"use client"
import { useState } from "react"
import Link from "next/link"

export type PracticeItem = {
  id: string
  user_id: string
  career_path_id: string
  submitted_link: string | null
  submitted_at: string | null
  attempt_count: number
  path_practice_tasks: { headline: string; brief: string; link_type: string } | null
  career_paths: { title: string } | null
  profile: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

type FormState = {
  score: number | null
  feedback: string
  submitting: boolean
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function Avatar({ url, name }: { url: string | null | undefined; name: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
    )
  }
  return (
    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-semibold text-indigo-700">{initials || "?"}</span>
    </div>
  )
}

function LinkIcon({ type }: { type: string }) {
  if (type === "google_drive") {
    return (
      <svg width="14" height="12" viewBox="0 0 87.3 78" fill="none" className="flex-shrink-0">
        <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 50H0c0 1.55.4 3.1 1.2 4.5L6.6 66.85Z" fill="#0066DA"/>
        <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 45.5C.4 46.9 0 48.45 0 50h27.5l16.15-25Z" fill="#00AC47"/>
        <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.65 10.85 8.1 12.95Z" fill="#EA4335"/>
        <path d="M43.65 25L57.4 0c-1.35-.8-2.9-1.2-4.5-1.2H34.4c-1.6 0-3.15.45-4.5 1.2L43.65 25Z" fill="#00832D"/>
        <path d="M59.8 50H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.8 50Z" fill="#2684FC"/>
        <path d="M73.4 25.5L59.65 1.2C58.85-.2 57.7-1.3 56.35-2.1l-.95.55L43.65 25l16.15 25h27.45c0-1.55-.4-3.1-1.2-4.5L73.4 25.5Z" fill="#FFBA00"/>
      </svg>
    )
  }
  // Figma (covers figma + figjam)
  return (
    <svg width="8" height="14" viewBox="0 0 200 300" fill="none" className="flex-shrink-0">
      <path d="M100 150c0-27.6 22.4-50 50-50s50 22.4 50 50-22.4 50-50 50-50-22.4-50-50z" fill="#1ABCFE"/>
      <path d="M0 250c0-27.6 22.4-50 50-50h50v50c0 27.6-22.4 50-50 50s-50-22.4-50-50z" fill="#0ACF83"/>
      <path d="M100 0h50c27.6 0 50 22.4 50 50s-22.4 50-50 50h-50V0z" fill="#FF7262"/>
      <path d="M0 50C0 22.4 22.4 0 50 0h50v100H50C22.4 100 0 77.6 0 50z" fill="#F24E1E"/>
      <path d="M0 150c0-27.6 22.4-50 50-50h50v100H50c-27.6 0-50-22.4-50-50z" fill="#A259FF"/>
    </svg>
  )
}

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function scoreColor(s: number) {
  if (s >= 8) return { bg: "bg-green-100 text-green-800 border-green-300", active: "bg-green-600 text-white border-green-600" }
  if (s >= 5) return { bg: "bg-amber-100 text-amber-800 border-amber-300", active: "bg-amber-500 text-white border-amber-500" }
  return { bg: "bg-red-100 text-red-700 border-red-300", active: "bg-red-500 text-white border-red-500" }
}

export default function PracticesClient({ practices }: { practices: PracticeItem[] }) {
  const [items, setItems] = useState<PracticeItem[]>(practices)
  const [expanded, setExpanded] = useState<string | null>(practices[0]?.id ?? null)
  const [forms, setForms] = useState<Record<string, FormState>>(
    Object.fromEntries(practices.map((p) => [p.id, { score: null, feedback: "", submitting: false }]))
  )
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const setForm = (id: string, patch: Partial<FormState>) =>
    setForms((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleReview = async (id: string, verdict: "passed" | "failed") => {
    const f = forms[id]
    if (f.score === null) return
    setForm(id, { submitting: true })
    try {
      const res = await fetch("/api/admin/review-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practice_id: id, score: f.score, feedback: f.feedback.trim(), status: verdict }),
      })
      if (!res.ok) throw new Error("Failed")
      showToast(`Review submitted — ${verdict}`, true)
      // Remove from list after short delay
      setTimeout(() => {
        setItems((prev) => prev.filter((p) => p.id !== id))
        setExpanded((e) => (e === id ? null : e))
      }, 800)
    } catch {
      showToast("Something went wrong, please try again.", false)
      setForm(id, { submitting: false })
    }
  }

  if (items.length === 0) {
    return (
      <div className="px-8 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">Practice Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">Review submitted practice projects</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-700">All caught up!</p>
          <p className="text-sm text-gray-400 mt-1">No practices are waiting for review.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-8 py-10 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.ok ? "bg-green-600" : "bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div className="mb-8 flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Practice Reviews</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review submitted practice projects</p>
        </div>
        <span className="ml-2 inline-flex items-center justify-center min-w-[26px] h-[26px] px-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
          {items.length}
        </span>
      </div>

      {/* Practice list */}
      <div className="flex flex-col gap-4 max-w-3xl">
        {items.map((practice) => {
          const f = forms[practice.id] ?? { score: null, feedback: "", submitting: false }
          const isOpen = expanded === practice.id
          const task = practice.path_practice_tasks
          const userName = [practice.profile?.first_name, practice.profile?.last_name].filter(Boolean).join(" ") || practice.profile?.email || "Unknown"
          const colors = f.score !== null ? scoreColor(f.score) : null
          const canSubmit = f.score !== null && !f.submitting

          return (
            <div key={practice.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Collapsed header — always visible */}
              <button
                onClick={() => setExpanded(isOpen ? null : practice.id)}
                className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                <Avatar url={practice.profile?.avatar_url} name={userName} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 truncate">{userName}</span>
                    {(practice.attempt_count ?? 1) > 1 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                        Attempt {practice.attempt_count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {practice.career_paths?.title ?? "—"} · {task?.headline ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-400">{fmt(practice.submitted_at)}</span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-5 flex flex-col gap-5">
                  {/* User + path meta */}
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Link
                      href={`/users/${practice.user_id}`}
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      View user profile →
                    </Link>
                    <span className="text-gray-300">·</span>
                    <span>{practice.profile?.email ?? "—"}</span>
                  </div>

                  {/* Task brief */}
                  {task && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Task Brief</p>
                      <p className="text-sm font-semibold text-gray-900 mb-1">{task.headline}</p>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{task.brief}</p>
                    </div>
                  )}

                  {/* Submitted link */}
                  {practice.submitted_link && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Submitted Link</p>
                      <a
                        href={practice.submitted_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline break-all"
                      >
                        <LinkIcon type={task?.link_type ?? "figma"} />
                        {practice.submitted_link}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                    </div>
                  )}

                  <div className="border-t border-gray-100" />

                  {/* Score picker */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Score</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {SCORES.map((s) => {
                        const c = scoreColor(s)
                        const isSelected = f.score === s
                        return (
                          <button
                            key={s}
                            onClick={() => setForm(practice.id, { score: s })}
                            className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-colors ${
                              isSelected ? c.active : c.bg
                            } hover:opacity-80`}
                          >
                            {s}
                          </button>
                        )
                      })}
                    </div>
                    {f.score !== null && (
                      <p className="text-xs text-gray-400 mt-2">
                        Selected: <span className="font-semibold text-gray-700">{f.score} / 10</span>
                        {f.score >= 8 && " · Excellent"}
                        {f.score >= 5 && f.score < 8 && " · Good"}
                        {f.score < 5 && " · Needs improvement"}
                      </p>
                    )}
                  </div>

                  {/* Feedback textarea */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Feedback</p>
                    <textarea
                      value={f.feedback}
                      onChange={(e) => setForm(practice.id, { feedback: e.target.value })}
                      placeholder="Write your feedback for the student…"
                      rows={4}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:border-indigo-400 transition-colors"
                    />
                  </div>

                  {/* Pass / Fail actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => handleReview(practice.id, "passed")}
                      disabled={!canSubmit}
                      className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-colors ${
                        canSubmit
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {f.submitting ? "Submitting…" : "Pass"}
                    </button>
                    <button
                      onClick={() => handleReview(practice.id, "failed")}
                      disabled={!canSubmit}
                      className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-colors ${
                        canSubmit
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {f.submitting ? "…" : "Fail"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
