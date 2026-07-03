import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { ticketIds } = await request.json()
    if (!Array.isArray(ticketIds) || ticketIds.length === 0)
      return NextResponse.json({ error: "ticketIds array is required" }, { status: 400 })

    const supabase = createServiceClient()
    const { error } = await supabase.from("tickets").delete().in("id", ticketIds)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, deleted: ticketIds.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
