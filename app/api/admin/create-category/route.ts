import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export async function POST(req: NextRequest) {
  const { name, description, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const supabase = createServiceClient()

  const { data: maxOrderRow } = await supabase
    .from("categories")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxOrderRow?.display_order ?? -1) + 1

  const { data: category, error } = await supabase
    .from("categories")
    .insert({
      name: name.trim(),
      slug: slugify(name),
      description: description?.trim() || null,
      color: color?.trim() || "#8557D4",
      display_order: nextOrder,
    })
    .select("id, name, slug, description, color, display_order")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, category })
}
