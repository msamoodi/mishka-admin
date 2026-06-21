import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const { id, headline, description, cta_url, cta_label, segment } = await req.json()
  if (!id || !headline?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("notifications")
    .update({
      headline: headline.trim(),
      description: description?.trim() || null,
      cta_url: cta_url?.trim() || null,
      cta_label: cta_label?.trim() || null,
      segment,
    })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
