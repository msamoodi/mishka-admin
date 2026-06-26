import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const PUBLIC_DIR =
  process.env.MISHKA_PUBLIC_DIR ??
  path.join(process.cwd(), "..", "mishka-app", "public")

function contentType(abs: string) {
  if (/\.mov$/i.test(abs)) return "video/quicktime"
  if (/\.webm$/i.test(abs)) return "video/webm"
  return "video/mp4"
}

// Supports Range requests so the preview player can seek/scrub.
export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path") ?? ""
  const safe = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "")
  const abs  = path.join(PUBLIC_DIR, safe)

  if (!abs.startsWith(PUBLIC_DIR) || !fs.existsSync(abs))
    return new NextResponse("Not found", { status: 404 })

  const stat = fs.statSync(abs)
  const range = request.headers.get("range")
  const type = contentType(abs)

  if (!range) {
    const buf = fs.readFileSync(abs)
    return new NextResponse(buf, {
      headers: { "Content-Type": type, "Content-Length": String(stat.size), "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=3600" },
    })
  }

  const match = range.match(/bytes=(\d*)-(\d*)/)
  const start = match?.[1] ? parseInt(match[1], 10) : 0
  const end = match?.[2] ? parseInt(match[2], 10) : stat.size - 1
  const chunk = fs.readFileSync(abs).subarray(start, end + 1)

  return new NextResponse(chunk, {
    status: 206,
    headers: {
      "Content-Type": type,
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Content-Length": String(chunk.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
