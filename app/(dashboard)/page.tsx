import { createServiceClient } from "@/lib/supabase/server"
import { AREAS, LEVELS } from "./career-paths/constants"
import Link from "next/link"

export const revalidate = 60

const LEVEL_COLOR: Record<string, string> = {
  basic:        "bg-blue-50 text-blue-700",
  intermediate: "bg-purple-50 text-purple-700",
  advanced:     "bg-orange-50 text-orange-700",
}

function levelLabel(v: string) {
  return LEVELS.find(l => l.value === v)?.label ?? v
}
function areaLabel(v: string) {
  return AREAS.find(a => a.value === v)?.label ?? v
}
function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function DashboardPage() {
  const supabase = createServiceClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  const [
    totalUsersResult,
    todayRegResult,
    todayActiveResult,
    profilesResult,
    careerPathsResult,
    userCoursesResult,
    pendingPracticesCountResult,
    totalCoursesResult,
    pendingPracticesListResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayStr),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", todayStr),
    supabase.from("profiles").select("id, first_name, last_name, email, avatar_url, country, interested_areas"),
    supabase.from("career_paths").select("id, title, area, category, levels, is_published"),
    supabase.from("user_courses").select("course_id, progress_percent, courses(id, course_name, category, level)"),
    supabase.from("user_path_practices").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase
      .from("user_path_practices")
      .select("id, user_id, submitted_at, path_practice_tasks(headline), career_paths(title)")
      .eq("status", "pending_review")
      .order("submitted_at", { ascending: false })
      .limit(50),
  ])

  const totalUsers       = totalUsersResult.count ?? 0
  const todayRegistered  = todayRegResult.count ?? 0
  const todayActive      = todayActiveResult.count ?? 0
  const pendingPractices = pendingPracticesCountResult.count ?? 0
  const totalCourses     = totalCoursesResult.count ?? 0
  const profiles         = profilesResult.data ?? []
  const careerPaths      = careerPathsResult.data ?? []
  const userCourses      = userCoursesResult.data ?? []

  // Profile map for practices list
  type ProfileRow = { id: string; first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null; country: string | null; interested_areas: string[] | null }
  const profileMap = new Map((profiles as ProfileRow[]).map(p => [p.id, p]))

  // Pending practices with user info merged
  type PendingPractice = {
    id: string
    user_id: string
    submitted_at: string | null
    path_practice_tasks: { headline: string } | null
    career_paths: { title: string } | null
    profile: { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null } | null
  }
  type RawPractice = { id: string; user_id: string; submitted_at: string | null; path_practice_tasks: unknown; career_paths: unknown }
  const pendingPracticesList: PendingPractice[] = ((pendingPracticesListResult.data ?? []) as RawPractice[]).map(p => ({
    id: p.id,
    user_id: p.user_id,
    submitted_at: p.submitted_at,
    path_practice_tasks: p.path_practice_tasks as { headline: string } | null,
    career_paths: p.career_paths as { title: string } | null,
    profile: profileMap.get(p.user_id) ?? null,
  }))

  // ── Countries ──────────────────────────────────────────────────────
  const countryCounts: Record<string, number> = {}
  for (const p of profiles as ProfileRow[]) {
    if (p.country) countryCounts[p.country] = (countryCounts[p.country] ?? 0) + 1
  }
  const top5Countries = Object.entries(countryCounts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const maxCountryCount = top5Countries[0]?.count ?? 1

  // ── Career path popularity ─────────────────────────────────────────
  const areaCounts: Record<string, number> = {}
  for (const p of profiles as ProfileRow[]) {
    for (const a of p.interested_areas ?? []) {
      areaCounts[a] = (areaCounts[a] ?? 0) + 1
    }
  }
  const top5Paths = [...careerPaths]
    .map(cp => ({ ...cp, interested_count: areaCounts[cp.area ?? ""] ?? 0 }))
    .sort((a, b) => b.interested_count - a.interested_count)
    .slice(0, 5)

  // ── Popular courses ────────────────────────────────────────────────
  type CourseRow = { id: string; course_name: string; category: string; level: string }
  const courseCount: Record<string, number> = {}
  const courseInfo:  Record<string, CourseRow> = {}
  for (const uc of userCourses) {
    const id = uc.course_id as string
    courseCount[id] = (courseCount[id] ?? 0) + 1
    if (uc.courses && !courseInfo[id]) courseInfo[id] = uc.courses as CourseRow
  }
  const popularCourses = Object.entries(courseCount)
    .map(([id, count]) => ({ ...(courseInfo[id] ?? { course_name: id, category: "", level: "" }), id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Engagement metrics ─────────────────────────────────────────────
  type UCRow = { course_id: string; progress_percent?: number | null; courses: CourseRow | null }
  const ucRows = userCourses as unknown as UCRow[]
  const totalEnrollments     = ucRows.length
  const completedEnrollments = ucRows.filter(uc => uc.progress_percent === 100).length
  const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0
  const avgProgress    = totalEnrollments > 0
    ? Math.round(ucRows.reduce((sum, uc) => sum + (uc.progress_percent ?? 0), 0) / totalEnrollments)
    : 0

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of platform activity</p>
      </div>

      {/* ── Two main columns ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6 items-start">

        {/* ── LEFT: Courses block ───────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Courses</h2>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
            <MiniStat label="Total Courses"     value={totalCourses}     />
            <MiniStat label="Total Enrollments" value={totalEnrollments} />
            <MiniStat label="Completion Rate"   value={completionRate}   suffix="%" accent="green" />
            <MiniStat label="Avg. Progress"     value={avgProgress}      suffix="%" accent="blue" />
          </div>
          <div className="border-t border-gray-100">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top 5 Popular Learning Paths</p>
            </div>
            {top5Paths.length === 0 ? (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">No learning paths yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {top5Paths.map((cp, i) => (
                  <div key={cp.id} className="flex items-center gap-3 px-6 py-3">
                    <span className="text-xs font-bold text-gray-300 w-4 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{cp.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{areaLabel(cp.area ?? "")}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {(cp.levels as string[]).slice(0, 2).map(l => (
                        <span key={l} className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${LEVEL_COLOR[l] ?? "bg-gray-100 text-gray-500"}`}>
                          {levelLabel(l)}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400 ml-1">{cp.interested_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT column: Users + Practices ──────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Users block */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Users</h2>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
              <MiniStat label="Total Users"      value={totalUsers}      />
              <MiniStat label="Registered Today" value={todayRegistered} accent="blue" />
              <MiniStat label="Active Today"     value={todayActive}     accent="green" />
            </div>
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top 5 Countries</p>
            </div>
            {top5Countries.length === 0 ? (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">No country data yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {top5Countries.map(({ country, count }) => (
                  <div key={country} className="flex items-center gap-4 px-6 py-3">
                    <span className="text-sm text-gray-700 w-28 truncate capitalize">{country}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gray-800" style={{ width: `${(count / maxCountryCount) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Practices block */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Practices</h2>
                <p className="text-xs text-gray-400 mt-0.5">Submissions awaiting review</p>
              </div>
              {pendingPractices > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {pendingPractices} pending
                </span>
              )}
            </div>

            {pendingPracticesList.length === 0 ? (
              <p className="px-6 py-10 text-center text-gray-400 text-sm">No pending reviews</p>
            ) : (
              <div className="divide-y divide-gray-100 overflow-y-auto max-h-72">
                {pendingPracticesList.map(p => {
                  const name = [p.profile?.first_name, p.profile?.last_name].filter(Boolean).join(" ") || p.profile?.email || "Unknown user"
                  const initial = name[0]?.toUpperCase() ?? "?"
                  return (
                    <Link
                      key={p.id}
                      href={`/users/${p.user_id}`}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {p.career_paths?.title ?? "—"} · {p.path_practice_tasks?.headline ?? "—"}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(p.submitted_at)}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Popular courses table ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Top 10 Popular Courses</h2>
          <p className="text-xs text-gray-400 mt-0.5">Ranked by number of enrolled users</p>
        </div>
        {popularCourses.length === 0 ? (
          <p className="px-5 py-10 text-center text-gray-400 text-sm">No enrollment data yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500 w-8">#</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Course</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Level</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Enrollments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {popularCourses.map((c, i) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-xs font-bold text-gray-300">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.course_name}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize text-xs">{c.category.replace(/-/g, " ")}</td>
                  <td className="px-4 py-3">
                    {c.level ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLOR[c.level] ?? "bg-gray-100 text-gray-600"}`}>
                        {levelLabel(c.level)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function MiniStat({
  label, value, suffix, accent,
}: {
  label: string
  value: number
  suffix?: string
  accent?: "blue" | "green" | "amber"
}) {
  const valueClass = accent === "blue"
    ? "text-blue-600"
    : accent === "green"
      ? "text-green-600"
      : accent === "amber"
        ? "text-amber-600"
        : "text-gray-900"

  return (
    <div className="px-6 py-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value.toLocaleString()}{suffix}</p>
    </div>
  )
}
