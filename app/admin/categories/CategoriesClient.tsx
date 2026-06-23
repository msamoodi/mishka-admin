"use client"
import { useState } from "react"

type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  color: string | null
  display_order: number
}

const DEFAULT_COLOR = "#8557D4"

export default function CategoriesClient({ categories: initial }: { categories: Category[] }) {
  const [categories, setCategories] = useState(initial)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editColor, setEditColor] = useState(DEFAULT_COLOR)
  const [updating, setUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError("")

    const res = await fetch("/api/admin/create-category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, color }),
    })
    const json = await res.json()

    if (json.ok) {
      setCategories((prev) => [...prev, json.category])
      setName("")
      setDescription("")
      setColor(DEFAULT_COLOR)
    } else {
      setError(json.error ?? "Failed to add category.")
    }
    setSaving(false)
  }

  const startEdit = (c: Category) => {
    setEditingId(c.id)
    setEditName(c.name)
    setEditDescription(c.description ?? "")
    setEditColor(c.color ?? DEFAULT_COLOR)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName("")
    setEditDescription("")
    setEditColor(DEFAULT_COLOR)
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return
    setUpdating(true)
    const res = await fetch("/api/admin/update-category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editName, description: editDescription, color: editColor }),
    })
    if (res.ok) {
      setCategories((prev) => prev.map((c) => c.id === id ? { ...c, name: editName.trim(), description: editDescription.trim() || null, color: editColor } : c))
      cancelEdit()
    }
    setUpdating(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? Courses already tagged with it will keep the old value.")) return
    setDeletingId(id)
    const res = await fetch("/api/admin/delete-category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setCategories((prev) => prev.filter((c) => c.id !== id))
    setDeletingId(null)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage course categories shown in the app.</p>
      </div>

      <div className="grid grid-cols-[380px_1fr] gap-6 items-start">
        {/* Add form */}
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-gray-900 text-sm">Add Category</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g. Product Design"
              required
              className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description…"
              rows={3}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 font-mono"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm rounded-lg px-3 py-2 bg-red-50 text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="h-10 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {saving ? "Adding…" : "Add Category"}
          </button>
        </form>

        {/* List */}
        <div>
          <h2 className="font-semibold text-gray-900 text-sm mb-3">All Categories</h2>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400">No categories yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {categories.map((c) => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  {editingId === c.id ? (
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="h-8 px-3 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(c.id)}
                          disabled={updating || !editName.trim()}
                          className="h-8 px-3 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
                        >
                          {updating ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span
                          className="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0 mt-0.5"
                          style={{ background: c.color ?? DEFAULT_COLOR }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">/{c.slug}</p>
                          {c.description && <p className="text-sm text-gray-500 mt-1.5">{c.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-xs font-medium text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          {deletingId === c.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
