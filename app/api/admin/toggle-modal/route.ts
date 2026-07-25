import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

// Activates one modal and deactivates all others
export async function POST(req: NextRequest) {
  const { id, active } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = createServiceClient()

  if (active) {
    // Deactivate all first
    await supabase.from("app_modals").update({ is_active: false }).neq("id", id)
  }

  const { data, error } = await supabase
    .from("app_modals")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, modal: data })
}
