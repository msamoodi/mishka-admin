"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Ticket = {
  id: string
  subject: string
  message: string
  status: string
  created_at: string
  user_id: string | null
  profiles: { first_name: string | null; last_name: string | null; email: string | null } | null
}

function statusBadge(status: string) {
  if (status === "resolved")
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Resolved</span>
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Open</span>
}

export default function TicketsClient({ tickets: initial }: { tickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initial)
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all")
  const [resolving, setResolving] = useState<string | null>(null)

  const handleResolve = async (id: string) => {
    setResolving(id)
    const supabase = createClient()
    const { error } = await supabase.from("tickets").update({ status: "resolved" }).eq("id", id)
    if (!error) {
      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: "resolved" } : t))
    }
    setResolving(null)
  }

  const filtered = tickets.filter((t) => filter === "all" || t.status === filter)

  const userName = (t: Ticket) => {
    const p = t.profiles
    if (!p) return t.user_id ? "User" : "Anonymous"
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ")
    return name || p.email || "User"
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tickets.filter((t) => t.status === "open").length} open · {tickets.filter((t) => t.status === "resolved").length} resolved</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["all", "open", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${filter === f ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No {filter === "all" ? "" : filter} tickets.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((ticket) => (
            <div key={ticket.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {statusBadge(ticket.status)}
                    <span className="text-xs text-gray-400">
                      {new Date(ticket.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{ticket.subject}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{userName(ticket)}</p>
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{ticket.message}</p>
                </div>
                {ticket.status === "open" && (
                  <button
                    onClick={() => handleResolve(ticket.id)}
                    disabled={resolving === ticket.id}
                    className="flex-shrink-0 h-8 px-3 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {resolving === ticket.id ? "Resolving…" : "Mark Resolved"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
