"use client"
import { useEffect } from "react"

type ToastType = "success" | "error"

export type ToastState = { message: string; type: ToastType } | null

export function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all animate-in slide-in-from-bottom-2 ${
        toast.type === "success"
          ? "bg-gray-900 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      <span>
        {toast.type === "success" ? "✓" : "✕"}
      </span>
      {toast.message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 text-xs">✕</button>
    </div>
  )
}
