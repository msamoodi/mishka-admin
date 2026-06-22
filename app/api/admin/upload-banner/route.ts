import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const linkUrl = (formData.get("link_url") as string | null) ?? ""

  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 })

  const supabase = createServiceClient()

  const ext = file.name.split(".").pop() ?? "png"
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("banners")
    .upload(path, await file.arrayBuffer(), { contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from("banners").getPublicUrl(path)

  const { data: maxOrderRow } = await supabase
    .from("banner_slides")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxOrderRow?.display_order ?? -1) + 1

  const { data: banner, error: insertError } = await supabase
    .from("banner_slides")
    .insert({ image_url: publicUrl, link_url: linkUrl.trim() || null, display_order: nextOrder })
    .select("id, image_url, link_url, display_order, created_at")
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ ok: true, banner })
}
