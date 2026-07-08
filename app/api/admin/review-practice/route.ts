import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { practice_id, score, feedback, status } = body as {
      practice_id: string
      score: number
      feedback: string
      status: "passed" | "failed"
    }

    if (!practice_id) return NextResponse.json({ error: "practice_id required" }, { status: 400 })
    if (status !== "passed" && status !== "failed") return NextResponse.json({ error: "status must be passed or failed" }, { status: 400 })
    if (typeof score !== "number" || score < 0 || score > 10) return NextResponse.json({ error: "score must be 0–10" }, { status: 400 })

    const supabase = createServiceClient()

    const { error } = await supabase
      .from("user_path_practices")
      .update({
        score,
        feedback: feedback?.trim() ?? null,
        status,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", practice_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
