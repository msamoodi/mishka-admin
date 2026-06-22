import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const { image_url, link_url } = await req.json()
  if (!image_url?.trim()) return NextResponse.json({ error: "Missing image" }, { status: 400 })

  const supabase = createServiceClient()

  const { data: maxOrderRow } = await supabase
    .from("banner_slides")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxOrderRow?.display_order ?? -1) + 1

  const { data: banner, error } = await supabase
    .from("banner_slides")
    .insert({ image_url: image_url.trim(), link_url: link_url?.trim() || null, display_order: nextOrder })
    .select("id, image_url, link_url, display_order, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, banner })
}
