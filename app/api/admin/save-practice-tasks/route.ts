import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export type PracticeTaskInput = {
  headline: string
  brief: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { career_path_id, tasks } = body as { career_path_id: string; tasks: PracticeTaskInput[] }

    if (!career_path_id) {
      return NextResponse.json({ error: "career_path_id is required" }, { status: 400 })
    }
    if (!Array.isArray(tasks) || tasks.length > 5) {
      return NextResponse.json({ error: "tasks must be an array of up to 5 items" }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Replace all tasks for this path
    await supabase.from("path_practice_tasks").delete().eq("career_path_id", career_path_id)

    const filled = tasks.filter((t) => t.headline?.trim())
    if (filled.length > 0) {
      const rows = filled.map((t, i) => ({
        career_path_id,
        headline: t.headline.trim(),
        brief: t.brief?.trim() ?? "",
        order_index: i,
      }))
      const { error } = await supabase.from("path_practice_tasks").insert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
