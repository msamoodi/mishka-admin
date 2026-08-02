import { createServiceClient } from "@/lib/supabase/server"
import TicketsClient from "./TicketsClient"

export const dynamic = "force-dynamic"

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

type Ticket = {
  id: string
  subject: string
  message: string
  status: string
  created_at: string
  user_id: string | null
  profiles: ProfileRow | null
}

export default async function TicketsPage() {
  const supabase = createServiceClient()

  const { data: ticketRows, error } = await supabase
    .from("tickets")
    .select("id, subject, message, status, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(500)

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

  // Fetch profiles separately — tickets table has no FK to profiles in schema
  type RawTicket = { id: string; subject: string; message: string; status: string; created_at: string; user_id: string | null }
  const userIds = [...new Set((ticketRows ?? []).map((t: RawTicket) => t.user_id).filter(Boolean))] as string[]
  const profileMap: Record<string, ProfileRow> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds)
    for (const p of (profiles ?? []) as ProfileRow[]) profileMap[p.id] = p
  }

  const tickets: Ticket[] = (ticketRows ?? []).map((t: RawTicket) => ({
    ...t,
    profiles: t.user_id ? (profileMap[t.user_id] ?? null) : null,
  }))

  return <TicketsClient tickets={tickets} />
}
