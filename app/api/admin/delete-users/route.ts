import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json()
    if (!Array.isArray(userIds) || userIds.length === 0)
      return NextResponse.json({ error: "userIds array is required" }, { status: 400 })

    const supabase = createServiceClient()
    const errors: string[] = []

    for (const id of userIds) {
      const { error } = await supabase.auth.admin.deleteUser(id)
      if (error) errors.push(`${id}: ${error.message}`)
    }

    if (errors.length > 0)
      return NextResponse.json({ error: errors.join(", ") }, { status: 500 })

    return NextResponse.json({ ok: true, deleted: userIds.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
