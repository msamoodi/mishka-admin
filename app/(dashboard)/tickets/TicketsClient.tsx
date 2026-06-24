"use client"
import { useState, useMemo } from "react"
import Link from "next/link"

type Ticket = {
  id: string
  subject: string
  status: string
  created_at: string
  user_id: string | null
  profiles: { first_name: string | null; last_name: string | null; email: string | null } | null
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open:     "bg-yellow-100 text-yellow-800",
    pending:  "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  )
}

const STATUS_OPTIONS = ["all", "open", "pending", "resolved"] as const
type StatusFilter = typeof STATUS_OPTIONS[number]

export default function TicketsClient({ tickets }: { tickets: Ticket[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc")

  const ticketTypes = useMemo(() => {
    const types = [...new Set(tickets.map((t) => t.subject))].sort()
    return ["all", ...types]
  }, [tickets])

  const filtered = useMemo(() => {
    return tickets
      .filter((t) => statusFilter === "all" || t.status === statusFilter)
      .filter((t) => typeFilter === "all" || t.subject === typeFilter)
      .filter((t) => {
        if (!search.trim()) return true
        const email = t.profiles?.email ?? ""
        return email.toLowerCase().includes(search.toLowerCase())
      })
      .sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        return sortDir === "desc" ? -diff : diff
      })
  }, [tickets, statusFilter, typeFilter, search, sortDir])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {tickets.filter((t) => t.status === "open").length} open ·{" "}
          {tickets.filter((t) => t.status === "pending").length} pending ·{" "}
          {tickets.filter((t) => t.status === "resolved").length} resolved
        </p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Email search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 pr-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 w-52"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${statusFilter === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 appearance-none cursor-pointer"
          >
            {ticketTypes.map((t) => (
              <option key={t} value={t}>{t === "all" ? "All types" : t}</option>
            ))}
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Sort by date */}
        <button
          onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}
          className="h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M6 12h12M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Date {sortDir === "desc" ? "↓" : "↑"}
        </button>

        {/* Result count */}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} ticket{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500">Ticket Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">No tickets match your filters.</td>
              </tr>
            ) : (
              filtered.map((ticket) => (
                <tr key={ticket.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{ticket.subject}</td>
                  <td className="px-4 py-3 text-gray-500">{ticket.profiles?.email ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(ticket.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="text-xs font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
