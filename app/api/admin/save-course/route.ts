import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...payload } = body

    const supabase = createServiceClient()

    let courseId: string = id

    if (id) {
      const { error } = await supabase.from("courses").update(payload).eq("id", id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { data, error } = await supabase.from("courses").insert(payload).select("id").single()
      if (error || !data) return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 })
      courseId = data.id
    }

    // Video courses: the course-level video IS the lesson — keep a single
    // video-type lesson row in sync so the learn page has content to show
    // without requiring a separate manual lesson to be created.
    if (payload.course_type === "video" && payload.video_url) {
      const { data: existing } = await supabase
        .from("lessons")
        .select("id")
        .eq("course_id", courseId)
        .eq("lesson_type", "video")
        .order("order_index", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (existing) {
        await supabase.from("lessons").update({ video_url: payload.video_url }).eq("id", existing.id)
      } else {
        await supabase.from("lessons").insert({
          course_id:    courseId,
          title:        payload.course_name ?? "Video",
          lesson_type:  "video",
          video_url:    payload.video_url,
          order_index:  0,
          is_published: true,
        })
      }
    }

    return NextResponse.json({ id: courseId })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
