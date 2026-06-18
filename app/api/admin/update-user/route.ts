import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ...fields } = body

    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 })
    if (Object.keys(fields).length === 0)
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })

    const supabase = createServiceClient()
    const { error } = await supabase.from("profiles").update(fields).eq("id", userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
