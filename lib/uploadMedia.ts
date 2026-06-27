import { withBasePath } from "@/lib/basePath"
import { createClient } from "@/lib/supabase/client"

const BUCKET = "course-media"

export type MediaKind = "images" | "audio" | "videos"

// Gets a signed upload URL from our own API (service-role only, so it doesn't
// require exposing storage write access via RLS), then uploads the file
// directly from the browser to Supabase Storage — bypassing this app's own
// serverless function body-size limit entirely.
export async function uploadMedia(file: File, kind: MediaKind, folder?: string): Promise<string> {
  const res = await fetch(withBasePath("/api/admin/get-upload-url"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, filename: file.name, folder }),
  })
  const json = await res.json()
  if (!res.ok || json.error) throw new Error(json.error ?? "Failed to get upload URL")

  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(json.path, json.token, file)
  if (error) throw new Error(error.message)

  return json.publicUrl as string
}
