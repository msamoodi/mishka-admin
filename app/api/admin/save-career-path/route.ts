import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, area, category, levels, career_levels, course_ids, is_published } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const supabase = createServiceClient()

    const payload = {
      title: title.trim(),
      area: area ?? "",
      category: category ?? "",
      levels: levels ?? [],
      career_levels: career_levels ?? [],
      course_ids: course_ids ?? [],
      is_published: is_published ?? false,
      updated_at: new Date().toISOString(),
    }

    if (id) {
      const { error } = await supabase.from("career_paths").update(payload).eq("id", id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, id })
    } else {
      const { data, error } = await supabase
        .from("career_paths")
        .insert(payload)
        .select("id")
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, id: data.id })
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
