"use client"
import { withBasePath, resolveAppUrl } from "@/lib/basePath"
import { useState } from "react"
import ImageUploader from "@/components/ImageUploader"

type Banner = {
  id: string
  image_url: string
  link_url: string | null
  display_order: number
  created_at: string
}

export default function BannersClient({ banners: initial }: { banners: Banner[] }) {
  const [banners, setBanners] = useState(initial)
  const [imageUrl, setImageUrl] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  const moveItem = async (index: number, direction: -1 | 1) => {
    const newBanners = [...banners]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newBanners.length) return
    ;[newBanners[index], newBanners[swapIndex]] = [newBanners[swapIndex], newBanners[index]]
    setBanners(newBanners)
    setReordering(true)
    await fetch(withBasePath("/api/admin/reorder-banners"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: newBanners.map((b) => b.id) }),
    })
    setReordering(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageUrl.trim()) return
    setSaving(true)
    setError("")

    const res = await fetch(withBasePath("/api/admin/create-banner"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, link_url: linkUrl }),
    })
    const json = await res.json()

    if (json.ok) {
      setBanners((prev) => [...prev, json.banner])
      setImageUrl("")
      setLinkUrl("")
    } else {
      setError(json.error ?? "Failed to add banner.")
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner slide?")) return
    setDeletingId(id)
    const res = await fetch(withBasePath("/api/admin/delete-banner"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setBanners((prev) => prev.filter((b) => b.id !== id))
    setDeletingId(null)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Banner Sliders</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage the image carousel shown on the app home page.</p>
      </div>

      <div className="grid grid-cols-[380px_1fr] gap-6 items-start">
        {/* Add form */}
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-gray-900 text-sm">Add Banner</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Photo <span className="text-red-400">*</span></label>
            <ImageUploader
              value={imageUrl}
              onChange={setImageUrl}
              placeholder="/images/home/slider/slider-1.png"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Link URL</label>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/courses or https://…"
              className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {error && (
            <div className="text-sm rounded-lg px-3 py-2 bg-red-50 text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={saving || !imageUrl.trim()}
            className="h-10 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {saving ? "Adding…" : "Add Banner"}
          </button>
        </form>

        {/* List */}
        <div>
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Current Banners</h2>
          {banners.length === 0 ? (
            <p className="text-sm text-gray-400">No banners yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {banners.map((b, index) => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  {/* Order controls */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0 || reordering}
                      className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-25 transition-colors"
                      title="Move up"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 9V3M6 3L3 6M6 3L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <span className="text-xs text-gray-400 text-center">{index + 1}</span>
                    <button
                      onClick={() => moveItem(index, 1)}
                      disabled={index === banners.length - 1 || reordering}
                      className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-25 transition-colors"
                      title="Move down"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 3V9M6 9L3 6M6 9L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>

                  <div className="rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 bg-gray-50" style={{ width: 140, aspectRatio: "16/9" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveAppUrl(b.image_url)}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 truncate">{b.image_url}</p>
                    <p className="text-sm text-gray-900 truncate mt-0.5">{b.link_url || "No link set"}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Added {new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    disabled={deletingId === b.id}
                    className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50 flex-shrink-0"
                  >
                    {deletingId === b.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
