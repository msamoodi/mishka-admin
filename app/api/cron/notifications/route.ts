import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { notifyUser } from "@/lib/notifications"

// Vercel automatically sends this header — add CRON_SECRET to your env vars
function authorized(req: NextRequest) {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()
  const sent = { nudge3: 0, reengagement7: 0, newCourses: 0 }

  // ── 1. 3-day soft nudge ────────────────────────────────────────────────────
  // Users whose last_accessed_at crossed the 3-day mark in the past 24 hours
  const { data: inactive3 } = await supabase
    .from("user_courses")
    .select("user_id, courses(course_name, slug)")
    .eq("status", "in_progress")
    .lt("last_accessed_at", daysAgo(3))
    .gt("last_accessed_at", daysAgo(4))

  if (inactive3?.length) {
    const userIds = inactive3.map((r: { user_id: string }) => r.user_id)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name")
      .in("id", userIds)

    const nameMap = Object.fromEntries((profiles ?? []).map((p: { id: string; first_name: string | null }) => [p.id, p.first_name ?? "there"]))

    await Promise.allSettled(
      inactive3.map((row: { user_id: string; courses: unknown }) => {
        const c = row.courses as { course_name?: string; slug?: string } | null
        const name = nameMap[row.user_id] ?? "there"
        return notifyUser(
          row.user_id,
          `Still with you, ${name} 👋`,
          `You haven't touched "${c?.course_name}" in a few days. Pick up where you left off!`,
          c?.slug ? `/courses/${c.slug}` : "/courses",
          "Continue"
        )
      })
    )
    sent.nudge3 = inactive3.length
  }

  // ── 2. 7-day re-engagement ─────────────────────────────────────────────────
  // Users whose last_accessed_at crossed the 7-day mark in the past 24 hours
  const { data: inactive7 } = await supabase
    .from("user_courses")
    .select("user_id, courses(course_name, slug)")
    .eq("status", "in_progress")
    .lt("last_accessed_at", daysAgo(7))
    .gt("last_accessed_at", daysAgo(8))

  if (inactive7?.length) {
    const userIds = inactive7.map((r: { user_id: string }) => r.user_id)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name")
      .in("id", userIds)

    const nameMap = Object.fromEntries((profiles ?? []).map((p: { id: string; first_name: string | null }) => [p.id, p.first_name ?? "there"]))

    await Promise.allSettled(
      inactive7.map((row: { user_id: string; courses: unknown }) => {
        const c = row.courses as { course_name?: string; slug?: string } | null
        const name = nameMap[row.user_id] ?? "there"
        return notifyUser(
          row.user_id,
          `${name}, your course is waiting 👀`,
          `It's been a week since you opened "${c?.course_name}". Don't let the momentum go!`,
          c?.slug ? `/courses/${c.slug}` : "/courses",
          "Get back to it"
        )
      })
    )
    sent.reengagement7 = inactive7.length
  }

  // ── 3. New course published in last 24 hours ───────────────────────────────
  const { data: newCourses } = await supabase
    .from("courses")
    .select("id, course_name, slug, category")
    .eq("is_published", true)
    .gt("created_at", daysAgo(1))

  if (newCourses?.length) {
    // Get all users with push subscriptions
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("user_id")

    const subscribedUserIds = [...new Set((subs ?? []).map((s: { user_id: string }) => s.user_id))]

    for (const course of newCourses) {
      await Promise.allSettled(
        subscribedUserIds.map(userId =>
          notifyUser(
            userId,
            "New course just dropped 🎉",
            `"${course.course_name}" is now available on Mishka!`,
            `/courses/${course.slug}`,
            "Check it out"
          )
        )
      )
      sent.newCourses += subscribedUserIds.length
    }
  }

  console.log("[cron/notifications]", sent)
  return NextResponse.json({ ok: true, sent })
}
