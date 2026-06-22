import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { notifyUser } from "@/lib/notifications"

export async function POST(req: NextRequest) {
  const { ticketId, reply } = await req.json()
  if (!ticketId) return NextResponse.json({ error: "Missing ticketId" }, { status: 400 })

  const supabase = createServiceClient()

  const update = reply === null
    ? { admin_reply: null }
    : { admin_reply: reply.trim(), status: "pending" }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .update(update)
    .eq("id", ticketId)
    .select("user_id, subject")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (reply !== null && ticket?.user_id) {
    await notifyUser(
      ticket.user_id,
      "New reply to your ticket",
      `Our support team replied to your ticket "${ticket.subject}".`,
      "/support"
    )
  }

  return NextResponse.json({ ok: true })
}
