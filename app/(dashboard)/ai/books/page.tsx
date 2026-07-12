import { createServiceClient } from "@/lib/supabase/server"
import BooksClient from "./BooksClient"

export const dynamic = "force-dynamic"

export default async function BooksPage() {
  const supabase = createServiceClient()
  const { data: books } = await supabase
    .from("ai_books")
    .select("id, title, author, category, level, page_count, file_size_kb, created_at")
    .order("created_at", { ascending: false })

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">AI Source Books</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload PDFs that GPT-4o will use as source material to generate courses.</p>
      </div>
      <BooksClient books={books ?? []} />
    </div>
  )
}
