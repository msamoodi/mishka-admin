"use client"
import { useRef, useState } from "react"
import { uploadMedia } from "@/lib/uploadMedia"

type Props = {
  value: string
  onChange: (url: string) => void
  placeholder?: string
}

export default function VideoUploader({ value, onChange, placeholder = "https://… or paste a path" }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError("")
    setUploading(true)
    try {
      const url = await uploadMedia(file, "videos")
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder={placeholder}
        />
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="h-9 px-3 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors whitespace-nowrap disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {value && (
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
          {value.startsWith("http") ? (
            <video key={value} controls preload="metadata" className="h-24 rounded-md bg-black flex-shrink-0" src={value} />
          ) : (
            <div className="w-10 h-10 rounded-md bg-gray-200 flex-shrink-0 flex items-center justify-center text-lg">🎬</div>
          )}
          <span className="text-xs text-gray-600 truncate flex-1">{value}</span>
          <button type="button" onClick={() => onChange("")} className="text-gray-400 hover:text-gray-700 text-xs flex-shrink-0">✕</button>
        </div>
      )}
    </div>
  )
}
