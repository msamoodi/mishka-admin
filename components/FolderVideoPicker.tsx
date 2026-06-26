"use client"
import { withBasePath, BASE_PATH } from "@/lib/basePath"
import { useState, useEffect, useRef } from "react"

type Props = {
  value: string
  onChange: (path: string) => void
  placeholder?: string
}

function getContents(allFiles: string[], currentPath: string[]) {
  const prefix = currentPath.join("/")
  const folders = new Set<string>()
  const files: string[] = []

  for (const f of allFiles) {
    const relative = f.replace(/^\/videos\//, "")
    if (prefix) {
      if (!relative.startsWith(prefix + "/")) continue
      const rest = relative.slice(prefix.length + 1)
      const parts = rest.split("/")
      if (parts.length === 1) files.push(f)
      else folders.add(parts[0])
    } else {
      const parts = relative.split("/")
      if (parts.length === 1) files.push(f)
      else folders.add(parts[0])
    }
  }
  return { folders: [...folders].sort(), files }
}

export default function FolderVideoPicker({ value, onChange, placeholder = "/videos/…" }: Props) {
  const [open,        setOpen]        = useState(false)
  const [allFiles,    setAllFiles]    = useState<string[]>([])
  const [loading,     setLoading]     = useState(false)
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(withBasePath("/api/admin/list-videos"))
      .then(r => r.json())
      .then(d => setAllFiles(d.videos ?? []))
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const { folders, files } = getContents(allFiles, currentPath)

  const select = (path: string) => {
    onChange(path)
    setOpen(false)
    setCurrentPath([])
  }

  return (
    <div ref={ref} className="relative flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => { setCurrentPath([]); setOpen(o => !o) }}
          className="h-9 px-3 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors whitespace-nowrap"
        >
          Browse
        </button>
      </div>

      {/* Preview player */}
      {value && (
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
          <video
            key={value}
            controls
            preload="metadata"
            className="h-24 rounded-md bg-black flex-shrink-0"
            src={`${BASE_PATH}/api/admin/video?path=${encodeURIComponent(value)}`}
          />
          <span className="text-xs text-gray-600 truncate flex-1">{value.split("/").pop()}</span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-gray-400 hover:text-gray-700 text-xs flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full min-w-[300px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">

          {/* Breadcrumb */}
          <div className="flex items-center flex-wrap gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={() => setCurrentPath([])}
              className="text-xs font-semibold text-gray-500 hover:text-gray-900"
            >
              videos
            </button>
            {currentPath.map((seg, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-gray-300 text-xs">/</span>
                <button
                  type="button"
                  onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-900"
                >
                  {seg}
                </button>
              </span>
            ))}
          </div>

          <div className="overflow-y-auto max-h-64 p-2">
            {loading && <p className="text-xs text-gray-400 text-center py-6">Loading…</p>}

            {!loading && folders.length === 0 && files.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No video files found</p>
            )}

            {!loading && currentPath.length > 0 && (
              <button
                type="button"
                onClick={() => setCurrentPath(p => p.slice(0, -1))}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 rounded-lg text-left mb-1"
              >
                ← Back
              </button>
            )}

            {/* Folders */}
            {!loading && folders.map(folder => (
              <button
                key={folder}
                type="button"
                onClick={() => setCurrentPath(p => [...p, folder])}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg text-left"
              >
                <span className="text-amber-500 text-sm leading-none">▶</span>
                <span className="font-medium">{folder}</span>
                <span className="text-gray-400 text-xs ml-0.5">/</span>
              </button>
            ))}

            {/* Video files */}
            {!loading && files.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => select(f)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors ${
                  value === f ? "bg-gray-900 text-white" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <span className="text-base leading-none flex-shrink-0">🎬</span>
                <span className="text-sm truncate">{f.split("/").pop()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
