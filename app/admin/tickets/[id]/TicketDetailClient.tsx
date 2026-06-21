"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Ticket = {
  id: string
  subject: string
  message: string
  status: string
  created_at: string
  admin_reply: string | null
  email: string | null
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

export default function TicketDetailClient({ ticket: initial }: { ticket: Ticket }) {
  const router = useRouter()
  const [ticket, setTicket] = useState(initial)
  const [reply, setReply] = useState(initial.admin_reply ?? "")
  const [editing, setEditing] = useState(!initial.admin_reply)
  const [resolving, setResolving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  const savedReply = ticket.admin_reply

  const setStatus = async (status: string) => {
    setResolving(true)
    const res = await fetch("/api/admin/resolve-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id, status }),
    })
    if (res.ok) setTicket((t) => ({ ...t, status }))
    setResolving(false)
  }

  const handleSaveReply = async () => {
    if (!reply.trim()) return
    setSaving(true)
    setError("")
    const res = await fetch("/api/admin/reply-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id, reply }),
    })
    if (res.ok) {
      setTicket((t) => ({ ...t, admin_reply: reply.trim(), status: "pending" }))
      setReply(reply.trim())
      setEditing(false)
    } else {
      setError("Failed to save. Try again.")
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm("Delete this reply?")) return
    setDeleting(true)
    setError("")
    const res = await fetch("/api/admin/reply-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id, reply: null }),
    })
    if (res.ok) {
      setTicket((t) => ({ ...t, admin_reply: null }))
      setReply("")
      setEditing(true)
    } else {
      setError("Failed to delete. Try again.")
    }
    setDeleting(false)
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/admin/tickets" className="hover:text-gray-700 transition-colors">Tickets</Link>
        <span>/</span>
        <span className="text-gray-600 font-medium truncate">{ticket.subject}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-400 font-mono mb-1">ID: {ticket.id}</p>
            <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
            {ticket.email && <p className="text-sm text-gray-500 mt-0.5">{ticket.email}</p>}
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Ticket</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
        </div>

        <div className="mt-4 text-xs text-gray-400">
          {new Date(ticket.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Reply */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Reply to user</p>
          {savedReply && !editing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Edit
              </button>
              <span className="text-gray-200">|</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}
        </div>

        {/* Read-only view */}
        {savedReply && !editing ? (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {savedReply}
          </div>
        ) : (
          /* Edit / compose view */
          <>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={5}
              placeholder="Write your reply…"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            <div className="flex items-center justify-end gap-2 mt-3">
              {savedReply && (
                <button
                  onClick={() => { setReply(savedReply); setEditing(false) }}
                  className="h-9 px-4 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSaveReply}
                disabled={saving || !reply.trim()}
                className="h-9 px-4 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                {saving ? "Saving…" : "Save Reply"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {ticket.status !== "resolved" ? (
          <button
            onClick={() => setStatus("resolved")}
            disabled={resolving}
            className="h-10 px-5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {resolving ? "Updating…" : "Mark as Resolved"}
          </button>
        ) : (
          <button
            onClick={() => setStatus("open")}
            disabled={resolving}
            className="h-10 px-5 rounded-lg text-sm font-medium bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 transition-colors"
          >
            {resolving ? "Updating…" : "Reopen Ticket"}
          </button>
        )}
        <button
          onClick={() => router.push("/admin/tickets")}
          className="h-10 px-5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Back to Tickets
        </button>
      </div>
    </div>
  )
}
