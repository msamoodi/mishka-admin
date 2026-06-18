import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const PUBLIC_DIR =
  process.env.MISHKA_PUBLIC_DIR ??
  path.join(process.cwd(), "..", "mishka-app", "public")

function collect(dir: string, base: string): string[] {
  if (!fs.existsSync(dir)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collect(full, base))
    else if (/\.mp3$/i.test(entry.name))
      out.push("/" + path.relative(base, full).replace(/\\/g, "/"))
  }
  return out
}

export async function GET() {
  const audio = collect(path.join(PUBLIC_DIR, "audio"), PUBLIC_DIR)
  return NextResponse.json({ audio })
}
