"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { SortableTh } from "@/components/SortableTh"
import { withBasePath } from "@/lib/basePath"

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
type TicketSortCol = "subject" | "email" | "status" | "created_at"

export default function TicketsClient({ tickets: initial }: { tickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initial)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [sortCol, setSortCol] = useState<TicketSortCol>("created_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const onSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortCol(col as TicketSortCol); setSortDir("asc") }
  }

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
        let av: string, bv: string
        if (sortCol === "email") { av = a.profiles?.email ?? ""; bv = b.profiles?.email ?? "" }
        else if (sortCol === "created_at") { av = a.created_at; bv = b.created_at }
        else { av = (a[sortCol] ?? "").toString(); bv = (b[sortCol] ?? "").toString() }
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
      })
  }, [tickets, statusFilter, typeFilter, search, sortCol, sortDir])

  const allFilteredSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id))

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((t) => next.delete(t.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((t) => next.add(t.id))
        return next
      })
    }
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} ticket${selected.size !== 1 ? "s" : ""}? This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch(withBasePath("/api/admin/delete-tickets"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketIds: [...selected] }),
    })
    if (res.ok) {
      setTickets((prev) => prev.filter((t) => !selected.has(t.id)))
      setSelected(new Set())
    } else {
      alert("Delete failed. Please try again.")
    }
    setDeleting(false)
  }

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

      {/* Filters + delete toolbar */}
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

        {/* Result count */}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} ticket{filtered.length !== 1 ? "s" : ""}</span>

        {/* Delete button — visible when something is selected */}
        {selected.size > 0 && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="h-9 px-4 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {deleting ? "Deleting…" : `Delete ${selected.size}`}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-400 cursor-pointer"
                />
              </th>
              <SortableTh col="subject"    label="Ticket Type" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="email"      label="Email"       sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="status"     label="Status"      sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="created_at" label="Date"        sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">No tickets match your filters.</td>
              </tr>
            ) : (
              filtered.map((ticket) => (
                <tr
                  key={ticket.id}
                  className={`border-b border-gray-50 last:border-0 transition-colors ${selected.has(ticket.id) ? "bg-red-50" : "hover:bg-gray-50"}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(ticket.id)}
                      onChange={() => toggleOne(ticket.id)}
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-400 cursor-pointer"
                    />
                  </td>
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
