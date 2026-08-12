import { Resend } from "resend"
import { createServiceClient } from "@/lib/supabase/server"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "uxerlife@gmail.com"

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

      <p style="font-size:11px;color:#ccc;border-top:1px solid #f0f0f0;padding-top:16px;margin:0">
        Mishka · Admin digest · ${date}
      </p>
    </div>
  `
}

export async function runDigest(): Promise<{ ok: boolean; to: string; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return { ok: false, to: ADMIN_EMAIL, error: "RESEND_API_KEY is not set" }
  }

  const supabase = createServiceClient()
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

  const totalEnrollments = totalEnrollRes.count ?? 0
  const completedEnroll  = completedEnrollRes.count ?? 0
  const progressRows = (avgProgressRes.data ?? []) as { progress_percent: number | null }[]
  const avgProgress = progressRows.length > 0
    ? Math.round(progressRows.reduce((s, r) => s + (r.progress_percent ?? 0), 0) / progressRows.length)
    : 0

  const resend = new Resend(resendKey)
  const { error } = await resend.emails.send({
    from: "Mishka <noreply@mishkaapp.com>",
    to: ADMIN_EMAIL,
    subject: `Mishka Daily Digest · ${now.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
    html: buildAdminEmail({
      totalUsers:           totalUsersRes.count ?? 0,
      newToday:             newTodayRes.count ?? 0,
      activeToday:          activeTodayRes.count ?? 0,
      newThisWeek:          newWeekRes.count ?? 0,
      totalEnrollments,
      completedEnrollments: completedEnroll,
      completionRate:       totalEnrollments > 0 ? Math.round((completedEnroll / totalEnrollments) * 100) : 0,
      avgProgress,
      totalCourses:         totalCoursesRes.count ?? 0,
      totalCerts:           totalCertsRes.count ?? 0,
      pendingPractices:     pendingRes.count ?? 0,
    }),
  })

  if (error) {
    return { ok: false, to: ADMIN_EMAIL, error: JSON.stringify(error) }
  }

  return { ok: true, to: ADMIN_EMAIL }
}
