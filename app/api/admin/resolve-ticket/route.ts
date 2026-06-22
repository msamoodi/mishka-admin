import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { notifyUser } from "@/lib/notifications"

const STATUS_COPY: Record<string, (subject: string) => { headline: string; description: string }> = {
  resolved: (subject) => ({ headline: "Ticket Resolved", description: `Your ticket "${subject}" has been marked as resolved.` }),
  open:     (subject) => ({ headline: "Ticket Reopened", description: `Your ticket "${subject}" has been reopened by our support team.` }),
  pending:  (subject) => ({ headline: "Ticket Update", description: `Your ticket "${subject}" is now pending.` }),
}

export async function POST(req: NextRequest) {
  const { ticketId, status = "resolved" } = await req.json()
  if (!ticketId) return NextResponse.json({ error: "Missing ticketId" }, { status: 400 })

  const supabase = createServiceClient()

  const { data: ticket, error } = await supabase
    .from("tickets")
    .update({ status })
    .eq("id", ticketId)
    .select("user_id, subject")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (ticket?.user_id) {
    const copy = STATUS_COPY[status]?.(ticket.subject) ?? { headline: "Ticket Update", description: `Your ticket "${ticket.subject}" status changed to ${status}.` }
    await notifyUser(ticket.user_id, copy.headline, copy.description, "/support")
  }

  return NextResponse.json({ ok: true })
}
