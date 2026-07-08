"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

type Counts = { tickets: number; practices: number }

export function NotificationBell() {
  const [counts, setCounts] = useState<Counts>({ tickets: 0, practices: 0 })
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchCounts = useCallback(async () => {
    const supabase = createClient()
    const [ticketsRes, practicesRes] = await Promise.all([
      supabase.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("user_path_practices").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
    ])
    setCounts({ tickets: ticketsRes.count ?? 0, practices: practicesRes.count ?? 0 })
  }, [])

  useEffect(() => {
    fetchCounts()
    const id = setInterval(fetchCounts, 30_000)
    return () => clearInterval(id)
  }, [fetchCounts])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [])

  const total = counts.tickets + counts.practices

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            {total === 0 && <p className="text-xs text-gray-400">All caught up</p>}
          </div>

          <div className="divide-y divide-gray-100">
            {/* Support Tickets */}
            <Link
              href="/tickets"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${counts.tickets > 0 ? "bg-yellow-100" : "bg-gray-100"}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={counts.tickets > 0 ? "text-yellow-700" : "text-gray-400"}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Support Tickets</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {counts.tickets > 0 ? `${counts.tickets} open ticket${counts.tickets !== 1 ? "s" : ""}` : "No open tickets"}
                </p>
              </div>
              {counts.tickets > 0 && (
                <span className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold">
                  {counts.tickets}
                </span>
              )}
            </Link>

            {/* Practice Reviews */}
            <Link
              href="/users"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${counts.practices > 0 ? "bg-amber-100" : "bg-gray-100"}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={counts.practices > 0 ? "text-amber-700" : "text-gray-400"}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Practice Reviews</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {counts.practices > 0 ? `${counts.practices} awaiting review` : "All reviewed"}
                </p>
              </div>
              {counts.practices > 0 && (
                <span className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                  {counts.practices}
                </span>
              )}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
