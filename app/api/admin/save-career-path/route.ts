import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, area, categories, levels, career_levels, course_ids, is_published, practice_link_type } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Strip anything that isn't a valid UUID — prevents DB errors when the AI
    // returns a course name instead of its ID
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const validCourseIds = (course_ids ?? []).filter(
      (id: unknown) => typeof id === "string" && UUID_RE.test(id)
    )

    const payload = {
      title: title.trim(),
      area: area ?? "",
      categories: categories ?? [],
      levels: levels ?? [],
      career_levels: career_levels ?? [],
      course_ids: validCourseIds,
      is_published: is_published ?? false,
      practice_link_type: practice_link_type ?? "figma",
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
