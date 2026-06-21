import { createServiceClient } from "@/lib/supabase/server"
import TicketsClient from "./TicketsClient"

export default async function TicketsPage() {
  const supabase = createServiceClient()

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, message, status, created_at, user_id, profiles(first_name, last_name, email)")
    .order("created_at", { ascending: false })

  return <TicketsClient tickets={tickets ?? []} />
}
