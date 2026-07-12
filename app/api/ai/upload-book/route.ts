import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file   = form.get("file")   as File | null
    const title  = form.get("title")  as string | null
    const author = form.get("author") as string | null
    const category = form.get("category") as string | null

    if (!file || !title) {
      return NextResponse.json({ error: "file and title are required" }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 })
    }

    const MAX_MB = 20
    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File must be under ${MAX_MB} MB` }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await pdfParse(buffer)
    const extractedText = parsed.text?.trim() ?? ""

    if (!extractedText) {
      return NextResponse.json({ error: "Could not extract text from PDF (it may be image-only)" }, { status: 422 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("ai_books")
      .insert({
        title:          title.trim(),
        author:         author?.trim() || null,
        category:       category || null,
        extracted_text: extractedText,
        page_count:     parsed.numpages ?? null,
        file_size_kb:   Math.round(file.size / 1024),
      })
      .select("id, title, author, category, page_count, file_size_kb, created_at")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ book: data })
  } catch (err) {
    console.error("[upload-book]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
