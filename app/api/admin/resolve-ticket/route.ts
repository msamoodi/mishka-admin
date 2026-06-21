import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const { ticketId } = await req.json()
  if (!ticketId) return NextResponse.json({ error: "Missing ticketId" }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase.from("tickets").update({ status: "resolved" }).eq("id", ticketId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
