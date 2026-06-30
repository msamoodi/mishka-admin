import { notFound } from "next/navigation"
import { createServiceClient } from "@/lib/supabase/server"
import TicketDetailClient from "./TicketDetailClient"

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  // Single query with embedded profile join — eliminates the sequential 2-query waterfall
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, subject, message, status, created_at, user_id, admin_reply, profiles(email)")
    .eq("id", id)
    .single()

  if (!ticket) notFound()

  type TicketWithProfile = typeof ticket & { profiles: { email: string } | null }
  const t = ticket as unknown as TicketWithProfile
  const email = t.profiles?.email ?? null

  return <TicketDetailClient ticket={{ ...ticket, email }} />
}
