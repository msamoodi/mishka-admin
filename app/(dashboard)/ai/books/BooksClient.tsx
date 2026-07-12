"use client"
import { useState, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { withBasePath } from "@/lib/basePath"

type Book = {
  id: string
  title: string
  author: string | null
  category: string | null
  page_count: number | null
  file_size_kb: number | null
  created_at: string
}

const CATEGORIES = [
  { value: "",                     label: "No category" },
  { value: "product-design",       label: "Product Design" },
  { value: "digital-marketing",    label: "Digital Marketing" },
  { value: "branding-design",      label: "Branding & Design" },
  { value: "user-research",        label: "User Research" },
  { value: "data-and-ai-literacy", label: "Data & AI Literacy" },
]

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.filter(c => c.value).map(c => [c.value, c.label])
)

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export default function BooksClient({ books: initial }: { books: Book[] }) {
  const router = useRouter()
  const [books, setBooks] = useState<Book[]>(initial)
  const [showForm, setShowForm] = useState(false)

  // Upload form state
  const fileRef = useRef<HTMLInputElement>(null)
  const [file,     setFile]     = useState<File | null>(null)
  const [title,    setTitle]    = useState("")
  const [author,   setAuthor]   = useState("")
  const [category, setCategory] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [deleting, startDelete] = useTransition()

  const reset = () => {
    setFile(null); setTitle(""); setAuthor(""); setCategory(""); setError(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleUpload = async () => {
    if (!file || !title.trim()) { setError("File and title are required."); return }
    setUploading(true); setError(null)
    const form = new FormData()
    form.append("file",     file)
    form.append("title",    title.trim())
    form.append("author",   author.trim())
    form.append("category", category)

    const res = await fetch(withBasePath("/api/ai/upload-book"), { method: "POST", body: form })
    const json = await res.json()
    setUploading(false)
    if (!res.ok) { setError(json.error ?? "Upload failed"); return }
    setBooks(prev => [json.book, ...prev])
    reset(); setShowForm(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm("Delete this book? It cannot be undone.")) return
    startDelete(async () => {
      await fetch(withBasePath("/api/ai/books"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      setBooks(prev => prev.filter(b => b.id !== id))
      router.refresh()
    })
  }

  return (
    <div>
      {/* Upload button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setShowForm(s => !s); reset() }}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          {showForm ? "Cancel" : "+ Upload Book"}
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Upload a PDF Book</h2>
          <div className="grid gap-4">
            {/* File picker */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">PDF File *</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                onChange={e => {
                  const f = e.target.files?.[0] ?? null
                  setFile(f)
                  if (f && !title) setTitle(f.name.replace(/\.pdf$/i, ""))
                }}
                className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
              />
              {file && (
                <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Book Title *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. The Design of Everyday Things"
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Author</label>
                <input
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  placeholder="e.g. Don Norman"
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Category (optional)</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={handleUpload}
              disabled={uploading || !file || !title.trim()}
              className="self-start px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {uploading ? "Extracting text…" : "Upload & Save"}
            </button>
          </div>
        </div>
      )}

      {/* Book list */}
      {books.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-sm">No books yet. Upload your first PDF to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Author</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Pages</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Size</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Uploaded</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {books.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{b.title}</td>
                  <td className="px-4 py-3 text-gray-500">{b.author ?? "—"}</td>
                  <td className="px-4 py-3">
                    {b.category ? (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {CATEGORY_LABELS[b.category] ?? b.category}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{b.page_count ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {b.file_size_kb ? `${b.file_size_kb} KB` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmt(b.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(b.id)}
                      disabled={deleting}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
