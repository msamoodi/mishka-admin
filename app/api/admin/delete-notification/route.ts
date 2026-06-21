import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

  const supabase = createServiceClient()

  const { error: delUserNotifsError } = await supabase.from("user_notifications").delete().in("notification_id", ids)
  if (delUserNotifsError) return NextResponse.json({ error: delUserNotifsError.message }, { status: 500 })

  const { error: delNotifsError } = await supabase.from("notifications").delete().in("id", ids)
  if (delNotifsError) return NextResponse.json({ error: delNotifsError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
