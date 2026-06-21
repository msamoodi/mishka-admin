"use client"
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

export default function TicketsClient({ tickets }: { tickets: Ticket[] }) {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {tickets.filter((t) => t.status === "open").length} open ·{" "}
          {tickets.filter((t) => t.status === "pending").length} pending ·{" "}
          {tickets.filter((t) => t.status === "resolved").length} resolved
        </p>
      </div>

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
            {tickets.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">No tickets yet.</td>
              </tr>
            )}
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{ticket.subject}</td>
                <td className="px-4 py-3 text-gray-500">{ticket.profiles?.email ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(ticket.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/tickets/${ticket.id}`}
                    className="text-xs font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
