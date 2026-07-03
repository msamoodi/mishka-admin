import { createServiceClient } from "@/lib/supabase/server"
import TicketsClient from "./TicketsClient"

export const dynamic = "force-dynamic"

export default async function TicketsPage() {
  const supabase = createServiceClient()

  const { data: ticketRows, error } = await supabase
    .from("tickets")
    .select("id, subject, message, status, created_at, user_id")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[tickets]", error)
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Support Tickets</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <strong>Database error:</strong> {error.message}
        </div>
      </div>
    )
  }

  const rows = ticketRows ?? []
  const userIds = [...new Set(rows.map((t) => t.user_id).filter(Boolean))] as string[]

  let profileMap: Record<string, { id: string; first_name: string | null; last_name: string | null; email: string | null }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds)
    if (profiles) {
      profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]))
    }
  }

  type Ticket = {
    id: string
    subject: string
    message: string
    status: string
    created_at: string
    user_id: string | null
    profiles: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null
  }

  const tickets: Ticket[] = rows.map((t) => ({
    ...t,
    profiles: t.user_id ? (profileMap[t.user_id] ?? null) : null,
  }))

  return <TicketsClient tickets={tickets} />
}
