import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

// Body: { updates: Array<{ id: string; order_index: number }> }
export async function POST(request: NextRequest) {
  try {
    const { updates } = await request.json() as { updates: { id: string; order_index: number }[] }
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "updates array required" }, { status: 400 })
    }

    const supabase = createServiceClient()

    await Promise.all(
      updates.map(({ id, order_index }) =>
        supabase.from("lessons").update({ order_index }).eq("id", id)
      )
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
