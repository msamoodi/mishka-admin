import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const { ticketId, reply } = await req.json()
  if (!ticketId || !reply?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("tickets")
    .update({ admin_reply: reply.trim(), status: "pending" })
    .eq("id", ticketId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
