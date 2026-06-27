"use client"
import { useRef, useState, useEffect } from "react"
import { uploadMedia } from "@/lib/uploadMedia"

type Props = {
  value: string
  onChange: (url: string) => void
  placeholder?: string
}

export default function AudioUploader({ value, onChange, placeholder = "https://… or paste a path" }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [playing, setPlaying] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlaying(false)
  }, [value])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError("")
    setUploading(true)
    try {
      const url = await uploadMedia(file, "audio")
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const togglePreview = () => {
    if (!value) return
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
    } else {
      const audio = new Audio(value)
      audio.addEventListener("ended", () => setPlaying(false))
      audio.play().catch(() => setPlaying(false))
      audioRef.current = audio
      setPlaying(true)
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
          accept="audio/*"
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
          <button
            type="button"
            onClick={togglePreview}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-700 flex-shrink-0"
          >
            {playing
              ? <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8"/><rect x="6" y="1" width="3" height="8"/></svg>
              : <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1L9 5L2 9V1Z"/></svg>
            }
          </button>
          <span className="text-xs text-gray-600 truncate flex-1">{value}</span>
          <button type="button" onClick={() => onChange("")} className="text-gray-400 hover:text-gray-700 text-xs flex-shrink-0">✕</button>
        </div>
      )}
    </div>
  )
}
