import { createServiceClient } from "@/lib/supabase/server"
import { AREAS, LEVELS } from "./career-paths/constants"

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

export default async function DashboardPage() {
  const supabase = createServiceClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  const [
    totalResult,
    todayRegResult,
    todayActiveResult,
    profilesResult,
    careerPathsResult,
    userCoursesResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayStr),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", todayStr),
    supabase.from("profiles").select("country, interested_areas"),
    supabase.from("career_paths").select("id, title, area, category, levels, is_published"),
    supabase.from("user_courses").select("course_id, progress_percent, courses(id, course_name, category, level)"),
  ])

  const totalUsers     = totalResult.count ?? 0
  const todayRegistered = todayRegResult.count ?? 0
  const todayActive    = todayActiveResult.count ?? 0
  const profiles       = profilesResult.data ?? []
  const careerPaths    = careerPathsResult.data ?? []
  const userCourses    = userCoursesResult.data ?? []

  // ── Countries ──────────────────────────────────────────────────────
  const countryCounts: Record<string, number> = {}
  for (const p of profiles) {
    if (p.country) {
      countryCounts[p.country] = (countryCounts[p.country] ?? 0) + 1
    }
  }
  const countries = Object.entries(countryCounts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)

  const maxCountryCount = countries[0]?.count ?? 1

  // ── Career path popularity via interested_areas ────────────────────
  const areaCounts: Record<string, number> = {}
  for (const p of profiles) {
    const areas = (p.interested_areas as string[] | null) ?? []
    for (const a of areas) {
      areaCounts[a] = (areaCounts[a] ?? 0) + 1
    }
  }
  const careerPathsRanked = [...careerPaths]
    .map(cp => ({ ...cp, interested_count: areaCounts[cp.area ?? ""] ?? 0 }))
    .sort((a, b) => b.interested_count - a.interested_count)

  // ── Popular courses ────────────────────────────────────────────────
  type CourseRow = { id: string; course_name: string; category: string; level: string }
  const courseCount: Record<string, number> = {}
  const courseInfo:  Record<string, CourseRow> = {}

  for (const uc of userCourses) {
    const id = uc.course_id as string
    courseCount[id] = (courseCount[id] ?? 0) + 1
    if (uc.courses && !courseInfo[id]) {
      courseInfo[id] = uc.courses as CourseRow
    }
  }

  const popularCourses = Object.entries(courseCount)
    .map(([id, count]) => ({ ...(courseInfo[id] ?? { course_name: id, category: "", level: "" }), id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Engagement metrics ─────────────────────────────────────────────
  type UCRow = { course_id: string; progress_percent?: number | null; courses: { id: string; course_name: string; category: string; level: string } | null }
  const ucRows = userCourses as unknown as UCRow[]
  const totalEnrollments = ucRows.length
  const completedEnrollments = ucRows.filter((uc) => uc.progress_percent === 100).length
  const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0
  const avgProgress = totalEnrollments > 0
    ? Math.round(ucRows.reduce((sum: number, uc: UCRow) => sum + (uc.progress_percent ?? 0), 0) / totalEnrollments)
    : 0

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of platform activity</p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-5">
        <StatCard label="Total Users"       value={totalUsers}      sub="all time" />
        <StatCard label="Registered Today"  value={todayRegistered} sub="new sign-ups" accent="blue" />
        <StatCard label="Active Today"      value={todayActive}     sub="visited today" accent="green" />
      </div>

      {/* ── Engagement row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-5">
        <StatCard label="Total Enrollments"  value={totalEnrollments}   sub="across all courses" />
        <StatCard label="Completion Rate"    value={completionRate}     sub="% of enrollments finished" accent="green" suffix="%" />
        <StatCard label="Avg. Progress"      value={avgProgress}        sub="% across active learners" accent="blue" suffix="%" />
      </div>

      {/* ── Two-column row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6">

        {/* Countries */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Users by Country</h2>
            <p className="text-xs text-gray-400 mt-0.5">{countries.length} countries</p>
          </div>
          {countries.length === 0 ? (
            <p className="px-5 py-10 text-center text-gray-400 text-sm">No country data yet</p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {countries.map(({ country, count }) => (
                <div key={country} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-sm text-gray-700 w-32 truncate capitalize">{country}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gray-800"
                      style={{ width: `${(count / maxCountryCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Career paths by popularity */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Popular Learning Paths</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ranked by matching user interests</p>
          </div>
          {careerPathsRanked.length === 0 ? (
            <p className="px-5 py-10 text-center text-gray-400 text-sm">No learning paths yet</p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {careerPathsRanked.map((cp, i) => (
                <div key={cp.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs font-bold text-gray-300 w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{cp.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{areaLabel(cp.area ?? "")}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(cp.levels as string[]).slice(0, 2).map(l => (
                      <span key={l} className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${LEVEL_COLOR[l] ?? "bg-gray-100 text-gray-500"}`}>
                        {levelLabel(l)}
                      </span>
                    ))}
                    <span className="text-xs text-gray-400 ml-1">
                      {cp.interested_count} interested
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Popular courses ─────────────────────────────────────────── */}
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

function StatCard({
  label, value, sub, accent, suffix,
}: {
  label: string
  value: number
  sub: string
  accent?: "blue" | "green"
  suffix?: string
}) {
  const accentClass = accent === "blue"
    ? "text-blue-600"
    : accent === "green"
      ? "text-green-600"
      : "text-gray-900"

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-4xl font-bold mt-2 ${accentClass}`}>{value.toLocaleString()}{suffix}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}
