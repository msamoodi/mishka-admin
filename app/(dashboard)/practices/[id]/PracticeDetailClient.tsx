"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Profile  = { id: string; first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null }
type Task     = { id: string; headline: string; brief: string; link_type: string }
type CareerPath = { id: string; title: string; career_levels: string[] | null }
type Practice = {
  id: string; user_id: string; career_path_id: string; task_id: string
  submitted_link: string | null; submitted_at: string | null; reviewed_at: string | null
  status: string; feedback: string | null; score: number | null; attempt_count: number
}

const SCORES = [0,1,2,3,4,5,6,7,8,9,10]
const LEVEL_LABEL: Record<string, string> = { junior: "Junior", middle: "Middle", senior: "Senior", lead: "Lead" }

function scoreColor(s: number) {
  if (s >= 8) return { idle: "bg-green-100 text-green-700 border-green-200",  active: "bg-green-600 text-white border-green-600"  }
  if (s >= 5) return { idle: "bg-amber-100 text-amber-700 border-amber-200",  active: "bg-amber-500 text-white border-amber-500"  }
  return         { idle: "bg-red-100 text-red-600 border-red-200",            active: "bg-red-500 text-white border-red-500"       }
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function Avatar({ url, name, size = 44 }: { url: string | null | undefined; name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  if (url) return <img src={url} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  return (
    <div className="rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <span className="font-semibold text-indigo-700" style={{ fontSize: size * 0.35 }}>{initials || "?"}</span>
    </div>
  )
}

function LinkIcon({ type }: { type: string }) {
  if (type === "google_drive") return (
    <svg width="16" height="14" viewBox="0 0 87.3 78" fill="none" className="flex-shrink-0 mt-0.5">
      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 50H0c0 1.55.4 3.1 1.2 4.5L6.6 66.85Z" fill="#0066DA"/>
      <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 45.5C.4 46.9 0 48.45 0 50h27.5l16.15-25Z" fill="#00AC47"/>
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.65 10.85 8.1 12.95Z" fill="#EA4335"/>
      <path d="M43.65 25L57.4 0c-1.35-.8-2.9-1.2-4.5-1.2H34.4c-1.6 0-3.15.45-4.5 1.2L43.65 25Z" fill="#00832D"/>
      <path d="M59.8 50H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.8 50Z" fill="#2684FC"/>
      <path d="M73.4 25.5L59.65 1.2C58.85-.2 57.7-1.3 56.35-2.1l-.95.55L43.65 25l16.15 25h27.45c0-1.55-.4-3.1-1.2-4.5L73.4 25.5Z" fill="#FFBA00"/>
    </svg>
  )
  return (
    <svg width="9" height="14" viewBox="0 0 200 300" fill="none" className="flex-shrink-0 mt-0.5">
      <path d="M100 150c0-27.6 22.4-50 50-50s50 22.4 50 50-22.4 50-50 50-50-22.4-50-50z" fill="#1ABCFE"/>
      <path d="M0 250c0-27.6 22.4-50 50-50h50v50c0 27.6-22.4 50-50 50s-50-22.4-50-50z" fill="#0ACF83"/>
      <path d="M100 0h50c27.6 0 50 22.4 50 50s-22.4 50-50 50h-50V0z" fill="#FF7262"/>
      <path d="M0 50C0 22.4 22.4 0 50 0h50v100H50C22.4 100 0 77.6 0 50z" fill="#F24E1E"/>
      <path d="M0 150c0-27.6 22.4-50 50-50h50v100H50c-27.6 0-50-22.4-50-50z" fill="#A259FF"/>
    </svg>
  )
}

export default function PracticeDetailClient({
  practice, profile, task, path,
}: {
  practice: Practice
  profile: Profile | null
  task: Task | null
  path: CareerPath | null
}) {
  const router = useRouter()
  const [score, setScore] = useState<number | null>(practice.score ?? null)
  const [feedback, setFeedback] = useState(practice.feedback ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const name   = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email || "Unknown"
  const levels = (path?.career_levels ?? []).map((l: string) => LEVEL_LABEL[l] ?? l).join(", ")
  const alreadyReviewed = practice.status === "passed" || practice.status === "failed"

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleReview = async (verdict: "passed" | "failed") => {
    if (score === null) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/review-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practice_id: practice.id, score, feedback: feedback.trim(), status: verdict }),
      })
      if (!res.ok) throw new Error("Failed")
      showToast(`Marked as ${verdict} — score ${score}/10`, true)
      setTimeout(() => router.push("/practices"), 1200)
    } catch {
      showToast("Something went wrong, please try again.", false)
      setSubmitting(false)
    }
  }

  return (
    <div className="px-8 py-8 max-w-2xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? "bg-green-600" : "bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => router.push("/practices")}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Practice Reviews
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* ── Header ── */}
        <div className="px-6 py-5 flex items-start gap-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-semibold text-gray-900">{name}</p>
              {(practice.attempt_count ?? 1) > 1 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                  Attempt {practice.attempt_count}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-0.5 truncate">
              {levels && `${levels} · `}{task?.headline ?? path?.title ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm text-gray-400">{fmt(practice.submitted_at)}</span>
            {alreadyReviewed && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${practice.status === "passed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {practice.status === "passed" ? "Passed" : "Failed"}
              </span>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 flex flex-col gap-5">
          {/* User link + email */}
          <div className="flex items-center gap-3 text-sm">
            <Link href={`/users/${practice.user_id}`} className="text-indigo-600 hover:underline font-medium">
              View user profile →
            </Link>
            <span className="text-gray-200">·</span>
            <span className="text-gray-500">{profile?.email ?? "—"}</span>
          </div>

          {/* Task brief */}
          {task && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Task Brief</p>
              <p className="text-sm font-semibold text-gray-900 mb-1.5">{task.headline}</p>
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
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-60">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            </div>
          )}

          <div className="border-t border-gray-100" />

          {/* Score */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-3">Score</p>
            <div className="flex gap-1.5 flex-wrap">
              {SCORES.map((s) => {
                const c = scoreColor(s)
                const active = score === s
                return (
                  <button
                    key={s}
                    onClick={() => setScore(s)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-colors ${active ? c.active : c.idle} hover:opacity-80`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
            {score !== null && (
              <p className="text-xs text-gray-400 mt-2">
                Selected: <span className="font-semibold text-gray-700">{score}/10</span>
                {score >= 8 && "  · Excellent"}
                {score >= 5 && score < 8 && "  · Good"}
                {score < 5 && "  · Needs improvement"}
              </p>
            )}
          </div>

          {/* Feedback */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">Feedback</p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Write your feedback for the student…"
              rows={5}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* Pass / Fail */}
          <div className="flex gap-3">
            <button
              onClick={() => handleReview("passed")}
              disabled={score === null || submitting}
              className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-colors ${
                score !== null && !submitting
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {submitting ? "Submitting…" : "Pass"}
            </button>
            <button
              onClick={() => handleReview("failed")}
              disabled={score === null || submitting}
              className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-colors ${
                score !== null && !submitting
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Fail
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
