import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = createServiceClient()

  const { data: banner } = await supabase.from("banner_slides").select("image_url").eq("id", id).single()

  const { error } = await supabase.from("banner_slides").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (banner?.image_url) {
    const path = banner.image_url.split("/banners/").pop()
    if (path) await supabase.storage.from("banners").remove([path])
  }

  return NextResponse.json({ ok: true })
}
