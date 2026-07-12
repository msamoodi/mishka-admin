import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { title, author, category, extractedText, pageCount, fileSizeKb } = await req.json() as {
      title: string
      author?: string
      category?: string
      extractedText: string
      pageCount?: number
      fileSizeKb?: number
    }

    if (!title?.trim() || !extractedText?.trim()) {
      return NextResponse.json({ error: "title and extractedText are required" }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("ai_books")
      .insert({
        title:          title.trim(),
        author:         author?.trim() || null,
        category:       category || null,
        extracted_text: extractedText.trim(),
        page_count:     pageCount ?? null,
        file_size_kb:   fileSizeKb ?? null,
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
