import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createServiceClient } from "@/lib/supabase/server"

const REPORT_EMAIL = "uxerlife@gmail.com"

function authorized(req: NextRequest) {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Europe/Istanbul",
  })
}

function stat(label: string, value: number | null, color = "#2B2BAA") {
  return `
    <div style="background:#f8f8f8;border-radius:12px;padding:16px 20px;display:inline-block;min-width:120px">
      <div style="font-size:28px;font-weight:700;color:${color}">${value ?? 0}</div>
      <div style="font-size:12px;color:#888;margin-top:2px">${label}</div>
    </div>`
}

function section(title: string, content: string) {
  return `
    <div style="margin-bottom:32px">
      <h2 style="font-size:13px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 14px">${title}</h2>
      ${content}
    </div>`
}

function row(label: string, value: string | number) {
  return `
    <tr>
      <td style="font-size:13px;color:#555;padding:6px 0;border-bottom:1px solid #f0f0f0">${label}</td>
      <td style="font-size:13px;font-weight:600;color:#222;padding:6px 0;border-bottom:1px solid #f0f0f0;text-align:right">${value}</td>
    </tr>`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()

  // ── 1. Users ──────────────────────────────────────────────────────────────
  const [
    { count: totalUsers },
    { count: newUsersToday },
    { data: activeRows },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gt("created_at", daysAgo(1)),
    supabase.from("user_courses").select("user_id").gt("last_accessed_at", daysAgo(7)),
  ])

  const activeUsersLast7 = new Set(
    (activeRows ?? []).map((r: { user_id: string }) => r.user_id)
  ).size

  // ── 2. Course Activity ─────────────────────────────────────────────────────
  const [
    { data: newEnrollments },
    { data: stalledRows },
    { data: allPublished },
    { data: accessedRows },
  ] = await Promise.all([
    supabase.from("user_courses").select("course_id, courses(course_name)").gt("created_at", daysAgo(7)),
    supabase.from("user_courses").select("course_id, courses(course_name)")
      .eq("status", "in_progress").lt("progress_percent", 30).lt("last_accessed_at", daysAgo(7)),
    supabase.from("courses").select("id, course_name").eq("is_published", true),
    supabase.from("user_courses").select("course_id").gt("last_accessed_at", daysAgo(7)),
  ])

  // Top enrolled this week
  const enrollMap: Record<string, { name: string; count: number }> = {}
  for (const r of (newEnrollments ?? []) as { course_id: string; courses: { course_name?: string } | null }[]) {
    if (!enrollMap[r.course_id]) enrollMap[r.course_id] = { name: r.courses?.course_name ?? r.course_id, count: 0 }
    enrollMap[r.course_id].count++
  }
  const topEnrolled = Object.values(enrollMap).sort((a, b) => b.count - a.count).slice(0, 3)

  // Top drop-off courses
  const dropMap: Record<string, { name: string; count: number }> = {}
  for (const r of (stalledRows ?? []) as { course_id: string; courses: { course_name?: string } | null }[]) {
    if (!dropMap[r.course_id]) dropMap[r.course_id] = { name: r.courses?.course_name ?? r.course_id, count: 0 }
    dropMap[r.course_id].count++
  }
  const topDropOff = Object.values(dropMap).sort((a, b) => b.count - a.count).slice(0, 3)

  // Zero-activity published courses (no access in 7 days)
  const activeCoursIds = new Set([
    ...(newEnrollments ?? []).map((r: { course_id: string }) => r.course_id),
    ...(accessedRows ?? []).map((r: { course_id: string }) => r.course_id),
  ])
  const zeroCourses = (allPublished ?? [] as { id: string; course_name: string }[])
    .filter((c: { id: string; course_name: string }) => !activeCoursIds.has(c.id))
    .map((c: { id: string; course_name: string }) => c.course_name)

  // ── 3. Support Tickets ─────────────────────────────────────────────────────
  const { data: ticketRows } = await supabase
    .from("tickets")
    .select("subject, status")
    .gt("created_at", daysAgo(7))

  const ticketTotal = (ticketRows ?? []).length
  const bySubject: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  for (const t of (ticketRows ?? []) as { subject: string; status: string }[]) {
    bySubject[t.subject] = (bySubject[t.subject] ?? 0) + 1
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1
  }

  // ── 4. Automated Notifications (last 24 h) ─────────────────────────────────
  const { data: notifRows } = await supabase
    .from("user_notifications")
    .select("notifications(headline, segment)")
    .gt("created_at", daysAgo(1))

  let nudge3 = 0
  let reengagement7 = 0
  for (const r of (notifRows ?? []) as { notifications: { headline?: string; segment?: string } | null }[]) {
    if (r.notifications?.segment !== "single") continue
    const h = r.notifications?.headline ?? ""
    if (h.includes("Still with you")) nudge3++
    else if (h.includes("course is waiting")) reengagement7++
  }

  // ── 5. At-Risk Users ──────────────────────────────────────────────────────
  const [
    { count: atRisk14 },
    { count: neverStarted },
  ] = await Promise.all([
    supabase.from("user_courses").select("*", { count: "exact", head: true })
      .eq("status", "in_progress").lt("last_accessed_at", daysAgo(14)),
    supabase.from("user_courses").select("*", { count: "exact", head: true })
      .eq("status", "in_progress").eq("progress_percent", 0),
  ])

  // ── Build email HTML ──────────────────────────────────────────────────────
  const usersSection = section("Users", `
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      ${stat("New today", newUsersToday, "#16a34a")}
      ${stat("Active (7d)", activeUsersLast7, "#2B2BAA")}
      ${stat("Total users", totalUsers, "#555")}
    </div>
  `)

  const topEnrolledRows = topEnrolled.length
    ? topEnrolled.map((c, i) => row(`${i + 1}. ${c.name}`, `${c.count} enrollments`)).join("")
    : row("No enrollments this week", "—")

  const dropOffRows = topDropOff.length
    ? topDropOff.map((c, i) => row(`${i + 1}. ${c.name}`, `${c.count} stalled`)).join("")
    : row("No stalled users", "—")

  const courseSection = section("Course Activity (last 7 days)", `
    <p style="font-size:11px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Top Enrolled</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px">${topEnrolledRows}</table>
    <p style="font-size:11px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Highest Drop-off (in-progress &lt;30%, idle 7d)</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px">${dropOffRows}</table>
    <p style="font-size:11px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Zero Activity This Week</p>
    ${zeroCourses.length
      ? `<p style="font-size:13px;color:#555;margin:0">${zeroCourses.join(", ")}</p>`
      : `<p style="font-size:13px;color:#aaa;margin:0">All published courses had activity 🎉</p>`
    }
  `)

  const subjectRows = Object.entries(bySubject).length
    ? Object.entries(bySubject).sort((a, b) => b[1] - a[1]).map(([k, v]) => row(k, v)).join("")
    : row("No tickets this week", "—")

  const statusRows = Object.entries(byStatus).length
    ? Object.entries(byStatus).map(([k, v]) => row(k, v)).join("")
    : ""

  const ticketSection = section("Support Tickets (last 7 days)", `
    <div style="background:#f8f8f8;border-radius:12px;padding:16px 20px;margin-bottom:14px">
      <div style="font-size:28px;font-weight:700;color:#2B2BAA">${ticketTotal}</div>
      <div style="font-size:12px;color:#888;margin-top:2px">Total tickets</div>
    </div>
    <p style="font-size:11px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">By Subject</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px">${subjectRows}</table>
    ${statusRows ? `
    <p style="font-size:11px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">By Status</p>
    <table width="100%" cellpadding="0" cellspacing="0">${statusRows}</table>` : ""}
  `)

  const notifSection = section("Automated Notifications (last 24 h)", `
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      ${stat("3-day nudges", nudge3, "#f59e0b")}
      ${stat("7-day re-engage", reengagement7, "#ef4444")}
    </div>
    <p style="font-size:12px;color:#bbb;margin-top:10px">Sent by the 07:00 UTC cron</p>
  `)

  const atRiskSection = section("At-Risk Users", `
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      ${stat("Inactive 14d+", atRisk14, "#ef4444")}
      ${stat("Never started", neverStarted, "#f59e0b")}
    </div>
    <p style="font-size:12px;color:#bbb;margin-top:10px">In-progress enrollments with no activity</p>
  `)

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:auto;padding:32px 24px;color:#222">
      <div style="margin-bottom:28px">
        <div style="display:inline-block;background:linear-gradient(90deg,#2B2BAA 0%,#5A2BAA 100%);border-radius:10px;padding:8px 14px;margin-bottom:14px">
          <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.5px">Mishka</span>
        </div>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px">Daily Insight Report</h1>
        <p style="font-size:13px;color:#999;margin:0">${todayLabel()}</p>
      </div>

      ${usersSection}
      ${courseSection}
      ${ticketSection}
      ${notifSection}
      ${atRiskSection}

      <p style="font-size:11px;color:#ddd;margin-top:40px;border-top:1px solid #f0f0f0;padding-top:16px">
        Mishka Insights · Sent automatically every day at 08:00 UTC
      </p>
    </div>
  `

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: "Mishka Insights <noreply@mishkaapp.com>",
    to: REPORT_EMAIL,
    subject: `Mishka Daily Report — ${todayLabel()}`,
    html,
  })

  console.log("[cron/insights] report sent")
  return NextResponse.json({ ok: true })
}
