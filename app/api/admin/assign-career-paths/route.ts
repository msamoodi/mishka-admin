import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

// POST { userId, careerPathId, assign: boolean }
// assign=true  → upsert row
// assign=false → delete row
export async function POST(request: NextRequest) {
  try {
    const { userId, careerPathId, assign } = await request.json()
    if (!userId || !careerPathId) {
      return NextResponse.json({ error: "userId and careerPathId are required" }, { status: 400 })
    }

    const supabase = createServiceClient()

    if (assign) {
      const { error } = await supabase
        .from("user_career_paths")
        .upsert({ user_id: userId, career_path_id: careerPathId }, { onConflict: "user_id,career_path_id" })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase
        .from("user_career_paths")
        .delete()
        .eq("user_id", userId)
        .eq("career_path_id", careerPathId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
