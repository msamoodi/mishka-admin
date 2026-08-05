import { Resend } from "resend"
import { createServiceClient } from "@/lib/supabase/server"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "uxerlife@gmail.com"

function progressBar(pct: number) {
  const filled = Math.round(pct / 10)
  const empty = 10 - filled
  return `${"█".repeat(filled)}${"░".repeat(empty)} ${pct}%`
}

function stat(label: string, value: string | number) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f4f4f4;font-size:13px;color:#555">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f4f4f4;font-size:13px;font-weight:700;color:#111;text-align:right">${value}</td>
    </tr>`
}

function buildAdminEmail(data: {
  totalUsers: number
  newToday: number
  activeToday: number
  newThisWeek: number
  totalEnrollments: number
  completedEnrollments: number
  completionRate: number
  avgProgress: number
  totalCourses: number
  totalCerts: number
  pendingPractices: number
  digestSentTo: number
}) {
  const date = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:auto;padding:32px 24px;color:#222">
      <div style="display:inline-block;background:linear-gradient(90deg,#2B2BAA 0%,#5A2BAA 100%);border-radius:10px;padding:8px 14px;margin-bottom:20px">
        <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.5px">Mishka Admin</span>
      </div>

      <h1 style="font-size:20px;font-weight:700;margin:0 0 4px">Daily Digest</h1>
      <p style="font-size:13px;color:#888;margin:0 0 28px">${date}</p>

      <h2 style="font-size:12px;font-weight:600;color:#aaa;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px">Users</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        ${stat("Total users", data.totalUsers.toLocaleString())}
        ${stat("New today", data.newToday)}
        ${stat("Active today", data.activeToday)}
        ${stat("New this week", data.newThisWeek)}
      </table>

      <h2 style="font-size:12px;font-weight:600;color:#aaa;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px">Learning</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        ${stat("Total courses", data.totalCourses)}
        ${stat("Total enrollments", data.totalEnrollments.toLocaleString())}
        ${stat("Completions", data.completedEnrollments.toLocaleString())}
        ${stat("Completion rate", `${data.completionRate}%`)}
        ${stat("Avg progress", `${data.avgProgress}%`)}
        ${stat("Certificates issued", data.totalCerts.toLocaleString())}
        ${stat("Practices pending review", data.pendingPractices)}
      </table>

      <h2 style="font-size:12px;font-weight:600;color:#aaa;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px">This Digest</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px">
        ${stat("Progress emails sent to users", data.digestSentTo)}
      </table>

      <p style="font-size:11px;color:#ccc;border-top:1px solid #f0f0f0;padding-top:16px;margin:0">
        Mishka · Admin digest · ${date}
      </p>
    </div>
  `
}

function buildUserEmail(name: string, courses: { name: string; slug: string; pct: number }[]) {
  const primary = courses[0]
  const appBase = process.env.NEXT_PUBLIC_APP_DOMAIN?.replace(/\/app$/, "") ?? "https://www.mishkaapp.com"

  const courseRows = courses
    .map(
      (c) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0">
          <div style="font-size:13px;font-weight:600;color:#222;margin-bottom:4px">${c.name}</div>
          <div style="font-size:12px;font-family:monospace;color:#888;letter-spacing:1px">${progressBar(c.pct)}</div>
        </td>
      </tr>`
    )
    .join("")

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:auto;padding:32px 24px;color:#222">
      <div style="display:inline-block;background:linear-gradient(90deg,#2B2BAA 0%,#5A2BAA 100%);border-radius:10px;padding:8px 14px;margin-bottom:20px">
        <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.5px">Mishka</span>
      </div>

      <h1 style="font-size:20px;font-weight:700;margin:0 0 6px">Hey ${name} 👋</h1>
      <p style="font-size:14px;color:#666;margin:0 0 24px">Here's where you stand today. Keep the momentum going.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        ${courseRows}
      </table>

      <a href="${appBase}/app/courses/${primary.slug}"
        style="display:inline-block;background:linear-gradient(90deg,#2B2BAA 0%,#5A2BAA 100%);color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:12px;margin-bottom:24px">
        Continue "${primary.name}" →
      </a>

      <p style="font-size:11px;color:#ddd;margin-top:32px;border-top:1px solid #f0f0f0;padding-top:16px">
        Mishka · You're receiving this because you have active courses.
      </p>
    </div>
  `
}

export async function runDigest(): Promise<{ sent: number }> {
  const supabase = createServiceClient()

  // ── Platform stats for admin email ───────────────────────────────────────
  const now      = new Date()
  const today    = new Date(now); today.setHours(0, 0, 0, 0)
  const week7ago = new Date(now.getTime() - 7 * 86400000)

  const [
    totalUsersRes,
    newTodayRes,
    activeTodayRes,
    newWeekRes,
    totalEnrollRes,
    completedEnrollRes,
    avgProgressRes,
    totalCoursesRes,
    totalCertsRes,
    pendingRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", today.toISOString()),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", week7ago.toISOString()),
    supabase.from("user_courses").select("*", { count: "exact", head: true }),
    supabase.from("user_courses").select("*", { count: "exact", head: true }).eq("progress_percent", 100),
    supabase.from("user_courses").select("progress_percent").limit(5000),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("user_path_certificates").select("*", { count: "exact", head: true }),
    supabase.from("user_path_practices").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
  ])

  const totalUsers       = totalUsersRes.count ?? 0
  const newToday         = newTodayRes.count ?? 0
  const activeToday      = activeTodayRes.count ?? 0
  const newThisWeek      = newWeekRes.count ?? 0
  const totalEnrollments = totalEnrollRes.count ?? 0
  const completedEnroll  = completedEnrollRes.count ?? 0
  const completionRate   = totalEnrollments > 0 ? Math.round((completedEnroll / totalEnrollments) * 100) : 0
  const totalCourses     = totalCoursesRes.count ?? 0
  const totalCerts       = totalCertsRes.count ?? 0
  const pendingPractices = pendingRes.count ?? 0

  const progressRows = (avgProgressRes.data ?? []) as { progress_percent: number | null }[]
  const avgProgress = progressRows.length > 0
    ? Math.round(progressRows.reduce((s, r) => s + (r.progress_percent ?? 0), 0) / progressRows.length)
    : 0

  // ── User progress emails ──────────────────────────────────────────────────
  const { data: enrollments } = await supabase
    .from("user_courses")
    .select("user_id, progress_percent, last_accessed_at, courses(course_name, slug)")
    .eq("status", "in_progress")
    .order("last_accessed_at", { ascending: false })

  type CourseEntry = { name: string; slug: string; pct: number }
  const byUser: Record<string, CourseEntry[]> = {}
  for (const r of (enrollments ?? []) as { user_id: string; progress_percent: number; courses: { course_name?: string; slug?: string } | null }[]) {
    if (!byUser[r.user_id]) byUser[r.user_id] = []
    byUser[r.user_id].push({
      name: r.courses?.course_name ?? "Your course",
      slug: r.courses?.slug ?? "",
      pct: r.progress_percent ?? 0,
    })
  }

  const userIds = Object.keys(byUser)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, email")
    .in("id", userIds)

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0

  const batch: { from: string; to: string; subject: string; html: string }[] = []
  for (const p of (profiles ?? []) as { id: string; first_name: string | null; email: string | null }[]) {
    if (!p.email) continue
    const courses = byUser[p.id]
    if (!courses?.length) continue
    const name = p.first_name ?? "there"
    batch.push({
      from: "Mishka <noreply@mishkaapp.com>",
      to: p.email,
      subject: `${name}, your courses are waiting 🐾`,
      html: buildUserEmail(name, courses),
    })
    if (batch.length === 100) {
      await resend.batch.send(batch.splice(0, 100))
      sent += 100
    }
  }
  if (batch.length > 0) {
    await resend.batch.send(batch)
    sent += batch.length
  }

  // ── Admin summary email ───────────────────────────────────────────────────
  await resend.emails.send({
    from: "Mishka <noreply@mishkaapp.com>",
    to: ADMIN_EMAIL,
    subject: `Mishka Daily Digest · ${now.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
    html: buildAdminEmail({
      totalUsers,
      newToday,
      activeToday,
      newThisWeek,
      totalEnrollments,
      completedEnrollments: completedEnroll,
      completionRate,
      avgProgress,
      totalCourses,
      totalCerts,
      pendingPractices,
      digestSentTo: sent,
    }),
  })

  return { sent }
}
