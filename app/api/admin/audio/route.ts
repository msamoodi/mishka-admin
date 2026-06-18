import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const PUBLIC_DIR =
  process.env.MISHKA_PUBLIC_DIR ??
  path.join(process.cwd(), "..", "mishka-app", "public")

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path") ?? ""
  const safe = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "")
  const abs  = path.join(PUBLIC_DIR, safe)

  if (!abs.startsWith(PUBLIC_DIR) || !fs.existsSync(abs))
    return new NextResponse("Not found", { status: 404 })

  const buf = fs.readFileSync(abs)
  return new NextResponse(buf, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600" },
  })
}
