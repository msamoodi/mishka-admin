import { NextResponse } from "next/server"
import { runDigest } from "@/lib/runDigest"

export async function POST() {
  const result = await runDigest()
  console.log("[admin/send-digest]", result)
  return NextResponse.json({ ok: true, ...result })
}
