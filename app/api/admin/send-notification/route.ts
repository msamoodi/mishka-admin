import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

const SEGMENT_FILTERS: Record<string, (now: Date) => { column: string; from?: string; to?: string } | null> = {
  all:          () => null,
  active:       (now) => ({ column: "last_seen_at", from: new Date(now.getTime() - 1 * 86400000).toISOString() }),
  semi_active:  (now) => ({ column: "last_seen_at", from: new Date(now.getTime() - 3 * 86400000).toISOString(), to: new Date(now.getTime() - 1 * 86400000).toISOString() }),
  not_active:   (now) => ({ column: "last_seen_at", from: new Date(now.getTime() - 7 * 86400000).toISOString(), to: new Date(now.getTime() - 3 * 86400000).toISOString() }),
  deactivated:  (now) => ({ column: "last_seen_at", to: new Date(now.getTime() - 10 * 86400000).toISOString() }),
}

export async function POST(req: NextRequest) {
  const { headline, description, cta_url, cta_label, segment = "all" } = await req.json()
  if (!headline?.trim()) return NextResponse.json({ error: "Headline is required" }, { status: 400 })

  const supabase = createServiceClient()
  const now = new Date()

  // Insert the notification record
  const { data: notification, error: notifError } = await supabase
    .from("notifications")
    .insert({ headline: headline.trim(), description: description?.trim() || null, cta_url: cta_url?.trim() || null, cta_label: cta_label?.trim() || null, segment })
    .select("id")
    .single()

  if (notifError || !notification) return NextResponse.json({ error: notifError?.message ?? "Failed to create notification" }, { status: 500 })

  // Fetch target users based on segment
  const filter = SEGMENT_FILTERS[segment]?.(now) ?? null
  let query = supabase.from("profiles").select("id")

  if (filter) {
    if (filter.from && filter.to) query = query.gte(filter.column, filter.from).lt(filter.column, filter.to)
    else if (filter.from)         query = query.gte(filter.column, filter.from)
    else if (filter.to)           query = query.lt(filter.column, filter.to)
  }

  const { data: users, error: usersError } = await query
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

  // Create user_notifications rows in batches
  const rows = (users ?? []).map((u: { id: string }) => ({ user_id: u.id, notification_id: notification.id }))
  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("user_notifications").insert(rows)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sent: rows.length })
}
