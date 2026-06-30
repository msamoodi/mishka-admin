import { createServiceClient } from "@/lib/supabase/server"
import TicketsClient from "./TicketsClient"

export default async function TicketsPage() {
  const supabase = createServiceClient()

  // Single query with embedded profile join — eliminates the sequential 2-query pattern
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("id, subject, message, status, created_at, user_id, profiles(id, first_name, last_name, email)")
    .order("created_at", { ascending: false })

  if (error) console.error("[tickets]", error)

  type Ticket = {
    id: string
    subject: string
    message: string
    status: string
    created_at: string
    user_id: string | null
    profiles: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null
  }

  return <TicketsClient tickets={(tickets ?? []) as unknown as Ticket[]} />
}
