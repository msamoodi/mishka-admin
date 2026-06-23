import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const { id, name, description } = await req.json()
  if (!id || !name?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("categories")
    .update({ name: name.trim(), description: description?.trim() || null })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
