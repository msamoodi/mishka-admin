"use client"
import { withBasePath } from "@/lib/basePath"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function DeleteCareerPathButton({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    await fetch(withBasePath("/api/admin/delete-career-path"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">Delete &quot;{title}&quot;?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "…" : "Yes"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
    >
      Delete
    </button>
  )
}
