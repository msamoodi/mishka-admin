import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { course_id, objectives } = await request.json()
    if (!course_id) return NextResponse.json({ error: "course_id required" }, { status: 400 })

    const supabase = createServiceClient()

    // Replace all objectives for this course
    const { error: delError } = await supabase
      .from("course_objectives")
      .delete()
      .eq("course_id", course_id)
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

    if (objectives && objectives.length > 0) {
      const rows = objectives.map((obj: { objective: string }, i: number) => ({
        course_id,
        objective: obj.objective.trim(),
        order_index: i,
      }))
      const { error: insError } = await supabase.from("course_objectives").insert(rows)
      if (insError) return NextResponse.json({ error: insError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
