import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

const BUCKET = "course-media"
const ALLOWED_KINDS = ["images", "audio", "videos"] as const
type Kind = (typeof ALLOWED_KINDS)[number]

function sanitizeFilename(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.\-]+/g, "-").replace(/-+/g, "-")
}

// Sanitizes a "/"-separated subfolder path, dropping empty/"."/".." segments
// so callers can't escape the kind's folder.
function sanitizeFolder(folder: string) {
  return folder
    .split("/")
    .map(seg => seg.toLowerCase().replace(/[^a-z0-9.\-]+/g, "-").replace(/-+/g, "-"))
    .filter(seg => seg && seg !== "." && seg !== "..")
    .join("/")
}

export async function POST(request: NextRequest) {
  try {
    const { kind, filename, folder } = await request.json()

    if (!ALLOWED_KINDS.includes(kind)) {
      return NextResponse.json({ error: `kind must be one of: ${ALLOWED_KINDS.join(", ")}` }, { status: 400 })
    }
    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "filename is required" }, { status: 400 })
    }

    const folderSegment = folder && typeof folder === "string" ? sanitizeFolder(folder) : ""
    const path = `${kind as Kind}/${folderSegment ? folderSegment + "/" : ""}${Date.now()}-${sanitizeFilename(filename)}`

    const supabase = createServiceClient()
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true })
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Failed to create signed upload URL" }, { status: 500 })
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: pub.publicUrl,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
