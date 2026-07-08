"use client"
import { withBasePath, resolveAppUrl } from "@/lib/basePath"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Toast, type ToastState } from "@/components/Toast"

const AVATARS = [
  "/images/avatars/avatar-0.png",
  "/images/avatars/avatar-8.png",
  "/images/avatars/avatar-2.png",
  "/images/avatars/avatar-3.png",
  "/images/avatars/avatar-5.png",
  "/images/avatars/avatar-7.png",
  "/images/avatars/avatar-6.png",
  "/images/avatars/avatar-1.png",
]

const RANK_COLOR: Record<string, string> = {
  starter:  "bg-gray-100 text-gray-600",
  bronze:   "bg-amber-50 text-amber-700",
  silver:   "bg-slate-50 text-slate-600",
  gold:     "bg-yellow-50 text-yellow-700",
  platinum: "bg-cyan-50 text-cyan-700",
  diamond:  "bg-blue-50 text-blue-700",
  sapphire: "bg-indigo-50 text-indigo-700",
  emerald:  "bg-green-50 text-green-700",
  ruby:     "bg-red-50 text-red-700",
  legend:   "bg-purple-50 text-purple-700",
}

type Profile = Record<string, unknown>

type AuthUser = {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
}

type AutoMatchedPath = {
  id: string
  title: string
}

type UserCourse = {
  course_id: string
  status: string
  progress_percent: number | null
  last_accessed_at: string | null
  completed_at: string | null
  courses: { id: string; course_name: string; slug: string; thumbnail_url?: string | null } | null
}

export type PracticeSubmission = {
  id: string
  career_path_id: string
  task_id: string
  submitted_link: string | null
  submitted_at: string | null
  status: string
  feedback: string | null
  score: number | null
  reviewed_at: string | null
  attempt_count: number
  path_practice_tasks: { headline: string; brief: string } | null
  career_paths: { title: string } | null
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

function AvatarImg({ url, size = 80, name = "?" }: { url: string | null | undefined; size?: number; name?: string }) {
  const [errored, setErrored] = useState(false)
  if (url && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolveAppUrl(url)}
        alt="avatar"
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setErrored(true)}
      />
    )
  }
  return (
    <div
      className="rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-48 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 break-all">{value ?? <span className="text-gray-300">—</span>}</span>
    </div>
  )
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === "boolean") return v ? "Yes" : "No"
  if (Array.isArray(v)) return v.join(", ") || null
  return String(v) || null
}

export default function UserDetailClient({
  profile,
  authUser,
  userCourses,
  calculatedCompleted,
  calculatedIncompleted,
  autoMatchedPaths,
  practiceSubmissions,
}: {
  profile: Profile
  authUser: AuthUser | null
  userCourses: UserCourse[]
  calculatedCompleted: number
  calculatedIncompleted: number
  autoMatchedPaths: AutoMatchedPath[]
  practiceSubmissions: PracticeSubmission[]
}) {
  const router = useRouter()
  const userId = String(profile.id)
  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "—"

  const [selectedAvatar, setSelectedAvatar] = useState<string>(String(profile.avatar_url ?? ""))
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(Boolean(profile.is_admin))
  const [savingAdmin, setSavingAdmin] = useState(false)
  const [confirmAdmin, setConfirmAdmin] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const [reviewForms, setReviewForms] = useState<Record<string, { score: string; feedback: string; submitting: boolean }>>({})

  const getReviewForm = (practiceId: string) =>
    reviewForms[practiceId] ?? { score: "", feedback: "", submitting: false }

  const updateReviewForm = (practiceId: string, patch: Partial<{ score: string; feedback: string; submitting: boolean }>) => {
    setReviewForms(prev => ({ ...prev, [practiceId]: { ...getReviewForm(practiceId), ...patch } }))
  }

  const handleReview = async (practiceId: string, verdict: "passed" | "failed") => {
    const form = getReviewForm(practiceId)
    const score = parseFloat(form.score)
    if (isNaN(score) || score < 0 || score > 10) {
      setToast({ message: "Score must be 0–10", type: "error" })
      return
    }
    updateReviewForm(practiceId, { submitting: true })
    const res = await fetch(withBasePath("/api/admin/review-practice"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practice_id: practiceId, score, feedback: form.feedback, status: verdict }),
    })
    const json = await res.json()
    updateReviewForm(practiceId, { submitting: false })
    if (!res.ok || json.error) {
      setToast({ message: json.error ?? "Failed to save review", type: "error" })
    } else {
      setToast({ message: verdict === "passed" ? "Marked as passed" : "Marked as failed", type: "success" })
      router.refresh()
    }
  }

  const avatarDirty = selectedAvatar !== String(profile.avatar_url ?? "")

  const handleToggleAdmin = async () => {
    setSavingAdmin(true)
    const next = !isAdmin
    const res = await fetch(withBasePath("/api/admin/update-user"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, is_admin: next }),
    })
    const json = await res.json()
    setSavingAdmin(false)
    setConfirmAdmin(false)
    if (!res.ok || json.error) {
      setToast({ message: json.error || "Failed to update admin status", type: "error" })
    } else {
      setIsAdmin(next)
      setToast({ message: next ? "User is now an admin" : "Admin access removed", type: "success" })
      router.refresh()
    }
  }

  const handleSaveAvatar = async () => {
    setSavingAvatar(true)
    const res  = await fetch(withBasePath("/api/admin/update-user"), {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId, avatar_url: selectedAvatar || null }),
    })
    const json = await res.json()
    setSavingAvatar(false)
    if (!res.ok || json.error) {
      setToast({ message: json.error || "Failed to save avatar", type: "error" })
    } else {
      setToast({ message: "Avatar updated", type: "success" })
      router.refresh()
    }
  }

  return (
    <>
      <Toast toast={toast} onClose={closeToast} />

      <div className="flex flex-col gap-6">

        {/* ── Avatar + name card ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-6 justify-between">

            <div className="flex items-start gap-6">
            {/* Current avatar */}
            <AvatarImg url={selectedAvatar || null} size={80} name={String(profile.first_name ?? displayName)} />

            <div>
              <h2 className="text-base font-semibold text-gray-900">{String(displayName)}</h2>
              <p className="text-sm text-gray-500">{String(profile.email ?? authUser?.email ?? "—")}</p>
              <span className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${RANK_COLOR[String(profile.rank ?? "")] ?? "bg-gray-100 text-gray-500"}`}>
                {String(profile.rank ?? "—")}
              </span>
              {isAdmin && (
                <span className="mt-2 ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                  Admin
                </span>
              )}
            </div>
            </div>

            {/* Make / Revoke Admin */}
            <div className="flex flex-col items-end gap-2">
              {confirmAdmin ? (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-xl">
                  <span className="text-xs text-red-700 font-medium">
                    {isAdmin ? "Revoke admin access?" : "Grant admin access?"}
                  </span>
                  <button
                    onClick={handleToggleAdmin}
                    disabled={savingAdmin}
                    className="h-7 px-3 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {savingAdmin ? "…" : "Yes"}
                  </button>
                  <button
                    onClick={() => setConfirmAdmin(false)}
                    className="h-7 px-3 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmAdmin(true)}
                  className={`h-8 px-4 text-xs font-medium rounded-lg border transition-colors ${
                    isAdmin
                      ? "border-red-200 text-red-600 hover:bg-red-50"
                      : "border-violet-200 text-violet-700 hover:bg-violet-50"
                  }`}
                >
                  {isAdmin ? "Revoke Admin" : "Make Admin"}
                </button>
              )}
            </div>
          </div>

          {/* Avatar picker */}
          <div className="mt-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Change Avatar</p>
            <div className="flex flex-wrap gap-3">
              {AVATARS.map(src => {
                const isSelected = selectedAvatar === src
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setSelectedAvatar(src)}
                    className={`rounded-full transition-all focus:outline-none ${
                      isSelected ? "ring-2 ring-offset-2 ring-gray-900" : "ring-1 ring-gray-200 hover:ring-gray-400 opacity-70 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveAppUrl(src)}
                      alt="avatar option"
                      className="w-14 h-14 rounded-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                  </button>
                )
              })}
            </div>
            {avatarDirty && (
              <button
                onClick={handleSaveAvatar}
                disabled={savingAvatar}
                className="mt-4 h-9 px-5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {savingAvatar ? "Saving…" : "Save Avatar"}
              </button>
            )}
          </div>
        </div>

        {/* ── Profile info ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Profile</h3>
          <InfoRow label="First Name"              value={str(profile.first_name)} />
          <InfoRow label="Last Name"               value={str(profile.last_name)} />
          <InfoRow label="Email"                   value={str(profile.email ?? authUser?.email)} />
          <InfoRow label="Avatar URL"              value={str(profile.avatar_url)} />
          <InfoRow label="Country"                 value={str(profile.country)} />
          <InfoRow label="Interested Areas"        value={str(profile.interested_areas)} />
          <InfoRow label="Career Level"            value={str(profile.career_level)} />
          <InfoRow label="Notifications Enabled"   value={str(profile.notifications_enabled)} />
          <InfoRow label="Account Status"          value={str(profile.account_status)} />
          <InfoRow label="Admin"                   value={isAdmin ? "Yes" : "No"} />
        </div>

        {/* ── Stats ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Completed Courses",   value: String(profile.completed_courses_count ?? calculatedCompleted) },
            { label: "In-Progress Courses", value: String(calculatedIncompleted) },
            { label: "Certificates",        value: str(profile.certificates_count) ?? "—" },
            { label: "Rank",                value: str(profile.rank) ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 capitalize">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Activity ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Activity</h3>
          <InfoRow label="Last Active"   value={fmt(str(profile.last_active_at))} />
          <InfoRow label="Last Login"    value={fmt(authUser?.last_sign_in_at)} />
          <InfoRow label="Account Created" value={fmt(authUser?.created_at)} />
        </div>

        {/* ── Learning Paths (read-only, auto-matched) ─────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Learning Paths</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Auto-matched from user&apos;s interested areas and career level — {autoMatchedPaths.length} matched
            </p>
          </div>
          {autoMatchedPaths.length === 0 ? (
            <p className="px-6 py-10 text-center text-gray-400 text-sm">
              No paths matched — user has not set interested areas or career level, or no published paths match their profile.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {autoMatchedPaths.map((path) => (
                <div key={path.id} className="flex items-center gap-4 px-6 py-4 bg-violet-50">
                  <div className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-violet-900">{path.title}</span>
                  <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                    Auto-matched
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Practice Projects ──────────────────────────────────────── */}
        {practiceSubmissions.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Practice Projects</h3>
              <p className="text-xs text-gray-400 mt-0.5">{practiceSubmissions.length} submission{practiceSubmissions.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="divide-y divide-gray-100">
              {practiceSubmissions.map(sub => {
                const isPending = sub.status === "pending_review"
                const form = getReviewForm(sub.id)
                const statusColors: Record<string, string> = {
                  eligible:       "bg-gray-100 text-gray-500",
                  pending_review: "bg-yellow-50 text-yellow-700",
                  passed:         "bg-green-50 text-green-700",
                  failed:         "bg-red-50 text-red-700",
                }
                const statusLabels: Record<string, string> = {
                  eligible:       "Eligible",
                  pending_review: "Pending Review",
                  passed:         "Passed",
                  failed:         "Failed",
                }
                return (
                  <div key={sub.id} className="px-6 py-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {sub.career_paths?.title ?? "Unknown Path"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Task: {sub.path_practice_tasks?.headline ?? "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {sub.score !== null && (
                          <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                            {sub.score}/10
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[sub.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {statusLabels[sub.status] ?? sub.status}
                        </span>
                      </div>
                    </div>

                    {sub.submitted_link && (
                      <a
                        href={sub.submitted_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline break-all mb-2"
                      >
                        {sub.submitted_link}
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0">
                          <path d="M1 9L9 1M9 1H4M9 1V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                      {sub.submitted_at && <span>Submitted {fmt(sub.submitted_at)}</span>}
                      {sub.attempt_count > 1 && <span>Attempt {sub.attempt_count}</span>}
                      {sub.reviewed_at && <span>Reviewed {fmt(sub.reviewed_at)}</span>}
                    </div>

                    {sub.feedback && (
                      <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-3">
                        {sub.feedback}
                      </p>
                    )}

                    {isPending && sub.submitted_link && (
                      <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex flex-col gap-3">
                        <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wide">Review</p>
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-gray-600 w-20 shrink-0">Score (0–10)</label>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            value={form.score}
                            onChange={e => updateReviewForm(sub.id, { score: e.target.value })}
                            placeholder="e.g. 7.5"
                            className="w-24 h-8 px-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                          />
                        </div>
                        <div className="flex items-start gap-3">
                          <label className="text-xs text-gray-600 w-20 shrink-0 pt-1.5">Feedback</label>
                          <textarea
                            value={form.feedback}
                            onChange={e => updateReviewForm(sub.id, { feedback: e.target.value })}
                            placeholder="Optional feedback for the student…"
                            rows={3}
                            className="flex-1 px-2 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none bg-white"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleReview(sub.id, "failed")}
                            disabled={form.submitting}
                            className="h-8 px-4 bg-red-50 text-red-700 border border-red-200 text-xs font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            {form.submitting ? "…" : "Mark Failed"}
                          </button>
                          <button
                            onClick={() => handleReview(sub.id, "passed")}
                            disabled={form.submitting}
                            className="h-8 px-4 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {form.submitting ? "…" : "Mark Passed"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Courses ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Courses</h3>
            <p className="text-xs text-gray-400 mt-0.5">{userCourses.length} enrolled</p>
          </div>

          {userCourses.length === 0 ? (
            <p className="px-6 py-10 text-center text-gray-400 text-sm">No courses enrolled yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Course</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Progress</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Last Accessed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {userCourses.map(uc => (
                  <tr key={uc.course_id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-xs">
                        {uc.courses?.course_name ?? uc.course_id}
                      </p>
                      <p className="text-xs text-gray-400">{uc.courses?.slug ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        uc.status === "completed"
                          ? "bg-green-50 text-green-700"
                          : "bg-blue-50 text-blue-700"
                      }`}>
                        {uc.status === "completed" ? "Completed" : "In Progress"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gray-900"
                            style={{ width: `${uc.progress_percent ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{uc.progress_percent ?? 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {fmt(uc.last_accessed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </>
  )
}
