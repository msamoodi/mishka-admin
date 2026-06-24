"use client"
import { withBasePath, BASE_PATH } from "@/lib/basePath"
import { useState, useEffect, useRef } from "react"

type Props = {
  value: string
  onChange: (path: string) => void
  placeholder?: string
}

function getContents(allImages: string[], currentPath: string[]) {
  const prefix = currentPath.join("/")
  const folders = new Set<string>()
  const images: string[] = []

  for (const img of allImages) {
    const relative = img.replace(/^\/images\//, "")
    if (prefix) {
      if (!relative.startsWith(prefix + "/")) continue
      const rest = relative.slice(prefix.length + 1)
      const parts = rest.split("/")
      if (parts.length === 1) images.push(img)
      else folders.add(parts[0])
    } else {
      const parts = relative.split("/")
      if (parts.length === 1) images.push(img)
      else folders.add(parts[0])
    }
  }
  return { folders: [...folders].sort(), images }
}

export default function FolderImagePicker({ value, onChange, placeholder = "/images/…" }: Props) {
  const [open,        setOpen]        = useState(false)
  const [allImages,   setAllImages]   = useState<string[]>([])
  const [loading,     setLoading]     = useState(false)
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(withBasePath("/api/admin/list-images"))
      .then(r => r.json())
      .then(d => setAllImages(d.images ?? []))
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const { folders, images } = getContents(allImages, currentPath)

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

      {value && (
        <div className="w-full h-28 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${BASE_PATH}/api/admin/image?path=${encodeURIComponent(value)}`}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
          />
        </div>
      )}

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full min-w-[320px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">

          {/* Breadcrumb */}
          <div className="flex items-center flex-wrap gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={() => setCurrentPath([])}
              className="text-xs font-semibold text-gray-500 hover:text-gray-900"
            >
              images
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

          <div className="overflow-y-auto max-h-72 p-2">
            {loading && <p className="text-xs text-gray-400 text-center py-6">Loading…</p>}

            {!loading && folders.length === 0 && images.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">Empty folder</p>
            )}

            {/* Back */}
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

            {/* Images grid */}
            {!loading && images.length > 0 && (
              <div className={`grid grid-cols-4 gap-1.5 ${folders.length > 0 ? "mt-2 pt-2 border-t border-gray-100" : ""}`}>
                {images.map(img => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => select(img)}
                    className={`group relative rounded-lg overflow-hidden border-2 transition-all ${
                      value === img ? "border-gray-900" : "border-transparent hover:border-gray-300"
                    }`}
                    title={img.split("/").pop()}
                  >
                    <div className="aspect-square bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${BASE_PATH}/api/admin/image?path=${encodeURIComponent(img)}`}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={e => {
                          const el = e.target as HTMLImageElement
                          el.style.display = "none"
                          el.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full text-gray-300 text-xl">🖼</div>'
                        }}
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {img.split("/").pop()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
