import { createServiceClient } from "@/lib/supabase/server"
import TicketsClient from "./TicketsClient"

export default async function TicketsPage() {
  const supabase = createServiceClient()

  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("id, subject, message, status, created_at, user_id")
    .order("created_at", { ascending: false })

  if (error) console.error("[tickets]", error)

  type RawTicket = { id: string; subject: string; message: string; status: string; created_at: string; user_id: string | null }
  type Profile = { id: string; first_name: string | null; last_name: string | null; email: string | null }

  const rows = (tickets ?? []) as RawTicket[]
  const userIds = [...new Set(rows.map((t) => t.user_id).filter((id): id is string => !!id))]
  const profileMap: Record<string, Profile> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds)
    for (const p of (profiles ?? []) as Profile[]) profileMap[p.id] = p
  }

  const ticketsWithProfiles = rows.map((t) => ({
    ...t,
    profiles: t.user_id ? (profileMap[t.user_id] ?? null) : null,
  }))

  return <TicketsClient tickets={ticketsWithProfiles} />
}
