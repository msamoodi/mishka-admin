"use client"
import { useState, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { withBasePath } from "@/lib/basePath"

type Book = {
  id: string
  title: string
  author: string | null
  category: string | null
  level: string | null
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

const LEVELS = [
  { value: "",             label: "No level" },
  { value: "basic",        label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced",     label: "Advanced" },
]

const LEVEL_LABELS: Record<string, string> = Object.fromEntries(
  LEVELS.filter(l => l.value).map(l => [l.value, l.label])
)

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.filter(c => c.value).map(c => [c.value, c.label])
)

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

type Phase =
  | { type: "idle" }
  | { type: "extracting"; page: number; total: number }
  | { type: "saving" }

// Use stable UMD build from cdnjs — exposes window.pdfjsLib, no Turbopack issues
const PDFJS_VERSION = "3.11.174"
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`

type PdfJs = {
  getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<PdfDoc> }
  GlobalWorkerOptions: { workerSrc: string }
}
type PdfDoc  = { numPages: number; getPage: (n: number) => Promise<PdfPage> }
type PdfPage = { getTextContent: () => Promise<{ items: { str?: string }[] }> }

async function loadPdfJs(): Promise<PdfJs> {
  const win = window as unknown as Record<string, unknown>
  if (win.pdfjsLib) return win.pdfjsLib as PdfJs

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = `${PDFJS_CDN}/pdf.min.js`   // UMD build exposes window.pdfjsLib
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"))
    document.head.appendChild(script)
  })

  const lib = win.pdfjsLib as PdfJs
  lib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`
  return lib
}

async function extractPdfText(
  file: File,
  onProgress: (page: number, total: number) => void
): Promise<{ text: string; pageCount: number }> {
  const pdfjsLib = await loadPdfJs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pageCount = pdf.numPages
  const pages: string[] = []

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => item.str ?? "")
      .join(" ")
    pages.push(pageText)
    onProgress(i, pageCount)
  }

  return { text: pages.join("\n"), pageCount }
}

export default function BooksClient({ books: initial }: { books: Book[] }) {
  const router = useRouter()
  const [books, setBooks] = useState<Book[]>(initial)
  const [showForm, setShowForm] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const [file,     setFile]     = useState<File | null>(null)
  const [title,    setTitle]    = useState("")
  const [author,   setAuthor]   = useState("")
  const [category, setCategory] = useState("")
  const [level,    setLevel]    = useState("")
  const [phase,    setPhase]    = useState<Phase>({ type: "idle" })
  const [error,    setError]    = useState<string | null>(null)
  const [deleting, startDelete] = useTransition()

  const busy = phase.type !== "idle"

  const reset = () => {
    setFile(null); setTitle(""); setAuthor(""); setCategory(""); setLevel("")
    setError(null); setPhase({ type: "idle" })
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleUpload = async () => {
    if (!file || !title.trim()) { setError("File and title are required."); return }
    setError(null)

    // Phase 1 — extract text in the browser, page by page
    let extractedText: string
    let pageCount: number
    try {
      setPhase({ type: "extracting", page: 0, total: 0 });
      ({ text: extractedText, pageCount } = await extractPdfText(file, (page, total) => {
        setPhase({ type: "extracting", page, total })
      }))
    } catch (err) {
      setPhase({ type: "idle" })
      setError("Could not read PDF — it may be encrypted or image-only.")
      console.error(err)
      return
    }

    if (!extractedText.trim()) {
      setPhase({ type: "idle" })
      setError("No text found in PDF — it may be a scanned image.")
      return
    }

    // Phase 2 — send text to server (just a DB insert, very fast)
    setPhase({ type: "saving" })
    const res = await fetch(withBasePath("/api/ai/upload-book"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:         title.trim(),
        author:        author.trim() || undefined,
        category:      category || undefined,
        level:         level || undefined,
        extractedText,
        pageCount,
        fileSizeKb:    Math.round(file.size / 1024),
      }),
    })
    const json = await res.json()
    setPhase({ type: "idle" })
    if (!res.ok) { setError(json.error ?? "Save failed"); return }
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

  // Progress bar helpers
  const progressPercent =
    phase.type === "extracting" && phase.total > 0
      ? Math.round((phase.page / phase.total) * 100)
      : phase.type === "saving" ? 100 : 0

  const progressLabel =
    phase.type === "extracting"
      ? phase.total === 0
        ? "Reading PDF…"
        : `Extracting page ${phase.page} of ${phase.total} (${Math.round((phase.page / phase.total) * 100)}%)`
      : phase.type === "saving"
      ? "Saving to database…"
      : ""

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
              {file && <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} KB</p>}
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

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Level (optional)</label>
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>

            {/* Progress */}
            {busy && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-700">{progressLabel}</span>
                  {phase.type === "saving" && (
                    <svg className="animate-spin w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 rounded-full transition-all duration-150"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={handleUpload}
              disabled={busy || !file || !title.trim()}
              className="self-start px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {busy ? "Processing…" : "Upload & Save"}
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
                <th className="text-left px-4 py-3 font-medium text-gray-500">Level</th>
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
                  <td className="px-4 py-3">
                    {b.level ? (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {LEVEL_LABELS[b.level] ?? b.level}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{b.page_count ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{b.file_size_kb ? `${b.file_size_kb} KB` : "—"}</td>
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
