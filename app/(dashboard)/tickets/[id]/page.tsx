import { notFound } from "next/navigation"
import { createServiceClient } from "@/lib/supabase/server"
import TicketDetailClient from "./TicketDetailClient"

export const dynamic = "force-dynamic"

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, subject, message, status, created_at, user_id, admin_reply")
    .eq("id", id)
    .single()

  if (!ticket) notFound()

  let email: string | null = null
  if (ticket.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", ticket.user_id)
      .single()
    email = profile?.email ?? null
  }

  return <TicketDetailClient ticket={{ ...ticket, email }} />
}
