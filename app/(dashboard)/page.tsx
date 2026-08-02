import { createServiceClient } from "@/lib/supabase/server"
import { AREAS, LEVELS } from "./career-paths/constants"
import { categoryLabel } from "@/lib/categoryLabel"
import Link from "next/link"
import { SendDigestButton } from "@/components/SendDigestButton"

export const revalidate = 300  // 5 min — dashboard doesn't need sub-minute freshness

const LEVEL_COLOR: Record<string, string> = {
  basic:        "bg-blue-50 text-blue-700",
  intermediate: "bg-purple-50 text-purple-700",
  advanced:     "bg-orange-50 text-orange-700",
}

function levelLabel(v: string) { return LEVELS.find(l => l.value === v)?.label ?? v }
function areaLabel(v: string)  { return AREAS.find(a => a.value === v)?.label ?? v }
function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function DashboardPage() {
  const supabase = createServiceClient()

  const now        = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const day7ago    = new Date(now.getTime() - 7  * 86400000)
  const day30ago   = new Date(now.getTime() - 30 * 86400000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalUsersResult,
    todayRegResult,
    todayActiveResult,
    newThisWeekResult,
    inactive30Result,
    inactive7to30Result,
    profilesResult,
    careerPathsResult,
    // user_courses split into lightweight count + id-only queries instead of full join
    totalEnrollmentsResult,
    completedEnrollmentsResult,
    courseIdsResult,          // only course_id — no text, no join
    avgProgressResult,        // only progress_percent — 5 k sample for approximation
    pendingPracticesCountResult,
    pendingPracticesListResult,
    totalCoursesResult,
    totalCertsResult,
    thisMonthCertsResult,
    certsByPathResult,
    passedPracticesResult,
    reviewedPracticesResult,
    practiceTimingsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", todayStart.toISOString()),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", day7ago.toISOString()),
    supabase.from("profiles").select("*", { count: "exact", head: true }).lt("last_active_at", day30ago.toISOString()).not("last_active_at", "is", null),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", day30ago.toISOString()).lt("last_active_at", day7ago.toISOString()),
    // profiles: only columns needed for country breakdown + practice profile lookup, hard-capped
    supabase.from("profiles").select("id, first_name, last_name, email, avatar_url, country, interested_areas").limit(5000),
    supabase.from("career_paths").select("id, title, area, category, levels, is_published"),
    // enrollment counts via DB aggregation (no row transfer)
    supabase.from("user_courses").select("*", { count: "exact", head: true }),
    supabase.from("user_courses").select("*", { count: "exact", head: true }).eq("progress_percent", 100),
    // popular courses: only course_id, no join
    supabase.from("user_courses").select("course_id").limit(20000),
    // avg progress: small sample, just one numeric column
    supabase.from("user_courses").select("progress_percent").limit(5000),
    supabase.from("user_path_practices").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("user_path_practices").select("id, user_id, submitted_at, path_practice_tasks(headline), career_paths(title)").eq("status", "pending_review").order("submitted_at", { ascending: false }).limit(50),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("user_path_certificates").select("*", { count: "exact", head: true }),
    supabase.from("user_path_certificates").select("*", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
    // certs by path: only the two ID/title columns needed for grouping, capped
    supabase.from("user_path_certificates").select("career_path_id, career_path_title").limit(3000),
    supabase.from("user_path_practices").select("*", { count: "exact", head: true }).eq("status", "passed"),
    supabase.from("user_path_practices").select("*", { count: "exact", head: true }).in("status", ["passed", "failed"]),
    supabase.from("user_path_practices").select("submitted_at, reviewed_at").not("reviewed_at", "is", null).limit(200),
  ])

  // ── Scalars ────────────────────────────────────────────────────────
  const totalUsers       = totalUsersResult.count ?? 0
  const todayRegistered  = todayRegResult.count ?? 0
  const todayActive      = todayActiveResult.count ?? 0
  const newThisWeek      = newThisWeekResult.count ?? 0
  const inactive30       = inactive30Result.count ?? 0
  const inactive7to30    = inactive7to30Result.count ?? 0
  const pendingPractices = pendingPracticesCountResult.count ?? 0
  const totalCourses     = totalCoursesResult.count ?? 0
  const totalCerts       = totalCertsResult.count ?? 0
  const thisMonthCerts   = thisMonthCertsResult.count ?? 0
  const passedPractices  = passedPracticesResult.count ?? 0
  const reviewedTotal    = reviewedPracticesResult.count ?? 0
  const passRate         = reviewedTotal > 0 ? Math.round((passedPractices / reviewedTotal) * 100) : 0

  const totalEnrollments     = totalEnrollmentsResult.count ?? 0
  const completedEnrollments = completedEnrollmentsResult.count ?? 0
  const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0

  // Avg progress from sampled rows
  const progressRows = (avgProgressResult.data ?? []) as { progress_percent: number | null }[]
  const avgProgress = progressRows.length > 0
    ? Math.round(progressRows.reduce((s, r) => s + (r.progress_percent ?? 0), 0) / progressRows.length)
    : 0

  const profiles    = profilesResult.data ?? []
  const careerPaths = careerPathsResult.data ?? []

  const publishedPathsCount = careerPaths.filter((cp: { is_published: boolean }) => cp.is_published).length

  // ── Avg review turnaround (days) ───────────────────────────────────
  type TimingRow = { submitted_at: string | null; reviewed_at: string | null }
  const timings = (practiceTimingsResult.data ?? []) as TimingRow[]
  const turnaroundDays = timings.length > 0
    ? Math.round(timings.reduce((sum, t) => {
        const diff = new Date(t.reviewed_at!).getTime() - new Date(t.submitted_at!).getTime()
        return sum + diff / 86400000
      }, 0) / timings.length * 10) / 10
    : null

  // ── Profile map ────────────────────────────────────────────────────
  type ProfileRow = { id: string; first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null; country: string | null; interested_areas: string[] | null }
  const profileMap = new Map((profiles as ProfileRow[]).map(p => [p.id, p]))

  // ── Pending practices list ─────────────────────────────────────────
  type PendingPractice = {
    id: string; user_id: string; submitted_at: string | null
    path_practice_tasks: { headline: string } | null
    career_paths: { title: string } | null
    profile: { first_name: string | null; last_name: string | null; email: string | null } | null
  }
  type RawPractice = { id: string; user_id: string; submitted_at: string | null; path_practice_tasks: unknown; career_paths: unknown }
  const pendingPracticesList: PendingPractice[] = ((pendingPracticesListResult.data ?? []) as RawPractice[]).map(p => ({
    id: p.id, user_id: p.user_id, submitted_at: p.submitted_at,
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
    .sort((a, b) => b.count - a.count).slice(0, 5)
  const maxCountryCount = top5Countries[0]?.count ?? 1

  // ── Top 5 paths by certificates ───────────────────────────────────
  type CertRow = { career_path_id: string; career_path_title: string }
  const certPathCount: Record<string, { count: number; title: string }> = {}
  for (const c of (certsByPathResult.data ?? []) as CertRow[]) {
    if (!certPathCount[c.career_path_id]) certPathCount[c.career_path_id] = { count: 0, title: c.career_path_title }
    certPathCount[c.career_path_id].count++
  }
  const top5CertPaths = Object.entries(certPathCount)
    .map(([id, { count, title }]) => ({ id, count, title }))
    .sort((a, b) => b.count - a.count).slice(0, 5)

  // ── Popular courses — aggregate from ID-only rows, then fetch names ──
  type CourseIdRow = { course_id: string }
  const courseCount: Record<string, number> = {}
  for (const uc of (courseIdsResult.data ?? []) as CourseIdRow[]) {
    courseCount[uc.course_id] = (courseCount[uc.course_id] ?? 0) + 1
  }
  const top10Entries = Object.entries(courseCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
  const top10Ids = top10Entries.map(([id]) => id)

  type CourseDetail = { id: string; course_name: string; category: string; level: string }
  let courseDetails: CourseDetail[] = []
  if (top10Ids.length > 0) {
    const { data } = await supabase
      .from("courses")
      .select("id, course_name, category, level")
      .in("id", top10Ids)
    courseDetails = (data ?? []) as CourseDetail[]
  }
  const detailMap = new Map(courseDetails.map(c => [c.id, c]))
  const popularCourses = top10Entries.map(([id, count]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...rest } = detailMap.get(id) ?? { course_name: id, category: "", level: "" }
    return { id, count, ...rest }
  })

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of platform activity</p>
        </div>
        <SendDigestButton />
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">

        {/* ════ LEFT COLUMN ════════════════════════════════════════════ */}
        <div className="flex flex-col gap-6">

          {/* Courses */}
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
          </div>

          {/* Learning Path */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Learning Path</h2>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
              <MiniStat label="Published Paths"    value={publishedPathsCount} />
              <MiniStat label="Certificates Issued" value={totalCerts}         accent="green" />
            </div>
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top 5 by Certificates</p>
            </div>
            {top5CertPaths.length === 0 ? (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">No certificates issued yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {top5CertPaths.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-6 py-3">
                    <span className="text-xs font-bold text-gray-300 w-4 text-center">{i + 1}</span>
                    <p className="flex-1 text-sm font-medium text-gray-900 truncate">{p.title}</p>
                    <span className="text-sm font-semibold text-gray-700 flex-shrink-0">{p.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 10 Popular Courses */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Top 10 Popular Courses</h2>
              <p className="text-xs text-gray-400 mt-0.5">Ranked by enrollments</p>
            </div>
            {popularCourses.length === 0 ? (
              <p className="px-6 py-10 text-center text-gray-400 text-sm">No enrollment data yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium text-gray-500 w-8">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Course</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Level</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">Enroll.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {popularCourses.map((c, i) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 text-xs font-bold text-gray-300">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{c.course_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{categoryLabel(c.category)}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        {c.level ? (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLOR[c.level] ?? "bg-gray-100 text-gray-600"}`}>
                            {levelLabel(c.level)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-right font-semibold text-gray-900">{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>

        {/* ════ RIGHT COLUMN ═══════════════════════════════════════════ */}
        <div className="flex flex-col gap-6">

          {/* Practices */}
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
                  return (
                    <Link key={p.id} href={`/users/${p.user_id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
                        {name[0]?.toUpperCase() ?? "?"}
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

          {/* Users */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Users</h2>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
              <MiniStat label="Total"         value={totalUsers}      />
              <MiniStat label="New Today"     value={todayRegistered} accent="blue" />
              <MiniStat label="Active Today"  value={todayActive}     accent="green" />
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

          {/* User Health */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">User Health</h2>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <MiniStat label="New This Week"     value={newThisWeek}   accent="blue" />
              <MiniStat label="At Risk (7–30d)"   value={inactive7to30} accent="amber" />
              <MiniStat label="Inactive 30d+"     value={inactive30}    />
            </div>
          </div>

          {/* Engagement Quality */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Engagement Quality</h2>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
              <MiniStat label="Certs This Month"    value={thisMonthCerts}                                        accent="green" />
              <MiniStat label="Practice Pass Rate"  value={passRate}            suffix="%"                        accent={passRate >= 70 ? "green" : passRate >= 40 ? "amber" : undefined} />
              <MiniStat label="Reviews Done"        value={reviewedTotal}                                         />
              <div className="px-6 py-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Avg Turnaround</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">
                  {turnaroundDays !== null ? `${turnaroundDays}d` : "—"}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, suffix, accent }: {
  label: string; value: number; suffix?: string; accent?: "blue" | "green" | "amber"
}) {
  const cls = accent === "blue" ? "text-blue-600" : accent === "green" ? "text-green-600" : accent === "amber" ? "text-amber-600" : "text-gray-900"
  return (
    <div className="px-6 py-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${cls}`}>{value.toLocaleString()}{suffix}</p>
    </div>
  )
}
