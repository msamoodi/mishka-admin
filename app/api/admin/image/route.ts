import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const PUBLIC_DIR =
  process.env.MISHKA_PUBLIC_DIR ??
  path.join(process.cwd(), "..", "mishka-app", "public")

export async function GET(request: NextRequest) {
  const imgPath = request.nextUrl.searchParams.get("path") ?? ""
  // Prevent path traversal
  const safe = path.normalize(imgPath).replace(/^(\.\.(\/|\\|$))+/, "")
  const abs  = path.join(PUBLIC_DIR, safe)

  if (!abs.startsWith(PUBLIC_DIR) || !fs.existsSync(abs))
    return new NextResponse("Not found", { status: 404 })

  const buf  = fs.readFileSync(abs)
  const ext  = path.extname(abs).toLowerCase().slice(1)
  const mime = ext === "svg" ? "image/svg+xml"
             : ext === "webp" ? "image/webp"
             : ext === "gif"  ? "image/gif"
             : ext === "png"  ? "image/png"
             : "image/jpeg"

  return new NextResponse(buf, { headers: { "Content-Type": mime, "Cache-Control": "public, max-age=3600" } })
}
