"use client"
import { withBasePath, BASE_PATH } from "@/lib/basePath"
import { useState, useEffect, useRef } from "react"

type Props = {
  value: string
  onChange: (path: string) => void
  placeholder?: string
}

export default function ImagePicker({ value, onChange, placeholder = "/images/…" }: Props) {
  const [open,   setOpen]   = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [filter,  setFilter]  = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(withBasePath("/api/admin/list-images"))
      .then(r => r.json())
      .then(d => setImages(d.images ?? []))
      .finally(() => setLoading(false))
  }, [open])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const visible = filter
    ? images.filter(p => p.toLowerCase().includes(filter.toLowerCase()))
    : images

  const select = (path: string) => { onChange(path); setOpen(false); setFilter("") }

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
          onClick={() => setOpen(o => !o)}
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
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter images…"
              className="w-full h-8 px-3 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="overflow-y-auto max-h-64 p-2">
            {loading && <p className="text-xs text-gray-400 text-center py-4">Loading…</p>}
            {!loading && visible.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No images found</p>
            )}
            {!loading && (
              <div className="grid grid-cols-4 gap-1.5">
                {visible.map(img => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => select(img)}
                    className={`group relative rounded-lg overflow-hidden border-2 transition-all ${
                      value === img ? "border-gray-900" : "border-transparent hover:border-gray-300"
                    }`}
                    title={img}
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
                          el.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full text-gray-300 text-lg">🖼</div>'
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
