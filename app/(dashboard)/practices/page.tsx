import { createServiceClient } from "@/lib/supabase/server"
import Link from "next/link"

export const dynamic = "force-dynamic"

type ProfileRow  = { id: string; first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null }
type PathRow     = { id: string; title: string; career_levels: string[] | null }
type PracticeRow = { id: string; user_id: string; career_path_id: string; task_id: string; submitted_at: string | null; reviewed_at: string | null; status: string; score: number | null; attempt_count: number }

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending_review: { label: "Pending",  cls: "bg-amber-100 text-amber-700" },
  passed:         { label: "Passed",   cls: "bg-green-100 text-green-700" },
  failed:         { label: "Failed",   cls: "bg-red-100 text-red-600"    },
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function Avatar({ url, name }: { url: string | null | undefined; name: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  if (url) return <img src={url} alt={name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
  return (
    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
      <span className="text-[10px] font-semibold text-indigo-700">{initials || "?"}</span>
    </div>
  )
}

export default async function PracticesPage() {
  const supabase = createServiceClient()

  const { data: practiceRows } = await supabase
    .from("user_path_practices")
    .select("id, user_id, career_path_id, task_id, submitted_at, reviewed_at, status, score, attempt_count")
    .in("status", ["pending_review", "passed", "failed"])
    .order("submitted_at", { ascending: false })

  const rows = (practiceRows ?? []) as PracticeRow[]

  const pendingCount = rows.filter(r => r.status === "pending_review").length

  if (rows.length === 0) {
    return (
      <div className="px-8 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">Practice Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">All submitted practice projects</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-600">No practice submissions yet</p>
        </div>
      </div>
    )
  }

  // Fetch profiles, paths and tasks in parallel
  const userIds = [...new Set(rows.map(r => r.user_id))]
  const pathIds = [...new Set(rows.map(r => r.career_path_id).filter(Boolean))]
  const taskIds = [...new Set(rows.map(r => r.task_id).filter(Boolean))]

  const [profilesRes, pathsRes, tasksRes] = await Promise.all([
    supabase.from("profiles").select("id, first_name, last_name, email, avatar_url").in("id", userIds),
    pathIds.length > 0
      ? supabase.from("career_paths").select("id, title, career_levels").in("id", pathIds)
      : Promise.resolve({ data: [] }),
    taskIds.length > 0
      ? supabase.from("path_practice_tasks").select("id, headline").in("id", taskIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = Object.fromEntries(((profilesRes.data ?? []) as ProfileRow[]).map(p => [p.id, p]))
  const pathMap    = Object.fromEntries(((pathsRes.data ?? []) as PathRow[]).map(p => [p.id, p]))
  const taskMap    = Object.fromEntries(((tasksRes.data ?? []) as { id: string; headline: string }[]).map(t => [t.id, t]))

  const LEVEL_LABEL: Record<string, string> = { junior: "Junior", middle: "Middle", senior: "Senior", lead: "Lead" }

  return (
    <div className="px-8 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Practice Reviews</h1>
          <p className="text-sm text-gray-500 mt-0.5">All submitted practice projects</p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[26px] h-[26px] px-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
            {pendingCount} pending
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">User</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Learning Path</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Level</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Submitted</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Review State</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const profile = profileMap[row.user_id] as ProfileRow | undefined
              const path    = pathMap[row.career_path_id] as PathRow | undefined
              const task    = taskMap[row.task_id] as { id: string; headline: string } | undefined
              const name    = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email || "—"
              const levels  = (path?.career_levels ?? []).map((l: string) => LEVEL_LABEL[l] ?? l).join(", ") || "—"
              const badge   = STATUS_BADGE[row.status] ?? { label: row.status, cls: "bg-gray-100 text-gray-600" }
              const reviewed = !!row.reviewed_at || row.status === "passed" || row.status === "failed"

              return (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {/* User */}
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900 truncate text-sm">{name}</p>
                    <p className="text-xs text-gray-400 truncate">{profile?.email ?? "—"}</p>
                  </td>
                  {/* Learning Path */}
                  <td className="px-4 py-3.5">
                    <p className="text-gray-800 font-medium truncate max-w-[180px]">{path?.title ?? "—"}</p>
                    {task && <p className="text-xs text-gray-400 truncate max-w-[180px] mt-0.5">{task.headline}</p>}
                  </td>
                  {/* Level */}
                  <td className="px-4 py-3.5">
                    <span className="text-gray-600 text-xs">{levels}</span>
                  </td>
                  {/* Submitted */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-gray-600 text-xs">{fmt(row.submitted_at)}</td>
                  {/* Review state */}
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${reviewed ? "text-green-700" : "text-amber-700"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${reviewed ? "bg-green-500" : "bg-amber-400 animate-pulse"}`} />
                      {reviewed ? "Reviewed" : "Awaiting"}
                    </span>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </td>
                  {/* Action */}
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/practices/${row.id}`}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap"
                    >
                      {row.status === "pending_review" ? "Review →" : "View →"}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
