import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createServiceClient } from "@/lib/supabase/server"

function authorized(req: NextRequest) {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
}

function progressBar(pct: number) {
  const filled = Math.round(pct / 10)
  const empty = 10 - filled
  return `${"█".repeat(filled)}${"░".repeat(empty)} ${pct}%`
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

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()

  // All in-progress enrollments, most recently accessed first
  const { data: enrollments } = await supabase
    .from("user_courses")
    .select("user_id, progress_percent, last_accessed_at, courses(course_name, slug)")
    .eq("status", "in_progress")
    .order("last_accessed_at", { ascending: false })

  if (!enrollments?.length) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  // Group courses by user_id (already sorted by last_accessed_at desc)
  type CourseEntry = { name: string; slug: string; pct: number }
  const byUser: Record<string, CourseEntry[]> = {}
  for (const r of enrollments as { user_id: string; progress_percent: number; courses: { course_name?: string; slug?: string } | null }[]) {
    if (!byUser[r.user_id]) byUser[r.user_id] = []
    byUser[r.user_id].push({
      name: r.courses?.course_name ?? "Your course",
      slug: r.courses?.slug ?? "",
      pct: r.progress_percent ?? 0,
    })
  }

  const userIds = Object.keys(byUser)

  // Fetch profiles for all users
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, email")
    .in("id", userIds)

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0

  // Send in batches of 100 (Resend limit)
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

  console.log("[cron/digest] sent", sent)
  return NextResponse.json({ ok: true, sent })
}
