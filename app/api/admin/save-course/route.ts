import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...payload } = body

    const supabase = createServiceClient()

    if (id) {
      const { error } = await supabase.from("courses").update(payload).eq("id", id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ id })
    } else {
      const { data, error } = await supabase.from("courses").insert(payload).select("id").single()
      if (error || !data) return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 })
      return NextResponse.json({ id: data.id })
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
