import { NextRequest, NextResponse } from "next/server"
import { runDigest } from "@/lib/runDigest"

export const maxDuration = 60

function authorized(req: NextRequest) {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const result = await runDigest()
  console.log("[cron/digest]", result)
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
