import { createServiceClient } from "@/lib/supabase/server"
import GenerateClient from "./GenerateClient"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function GeneratePage() {
  const supabase = createServiceClient()
  const { data: books } = await supabase
    .from("ai_books")
    .select("id, title, author, category")
    .order("created_at", { ascending: false })

  if (!books?.length) {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Generate Course</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800">
          <p className="font-semibold mb-1">No books uploaded yet</p>
          <p>Upload at least one PDF book before generating a course.</p>
          <Link href="/ai/books" className="mt-3 inline-block px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700">
            Go to Books →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Generate Course with AI</h1>
        <p className="text-sm text-gray-500 mt-0.5">Select books, choose a category and level, then let GPT-4o build the course.</p>
      </div>
      <GenerateClient books={books} />
    </div>
  )
}
