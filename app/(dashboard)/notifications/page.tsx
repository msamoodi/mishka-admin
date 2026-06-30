import { createServiceClient } from "@/lib/supabase/server"
import NotificationsClient from "./NotificationsClient"

export default async function AdminNotificationsPage() {
  const supabase = createServiceClient()

  // Single query with embedded count join — eliminates the sequential 2-query pattern
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, headline, description, cta_url, cta_label, segment, created_at, user_notifications(count)")
    .order("created_at", { ascending: false })

  type NotifRow = {
    id: string
    headline: string
    description: string | null
    cta_url: string | null
    cta_label: string | null
    segment: string
    created_at: string
    user_notifications: { count: number }[]
  }

  const enriched = ((notifications ?? []) as unknown as NotifRow[]).map((n) => ({
    id: n.id,
    headline: n.headline,
    description: n.description,
    cta_url: n.cta_url,
    cta_label: n.cta_label,
    segment: n.segment,
    created_at: n.created_at,
    sent_count: n.user_notifications?.[0]?.count ?? 0,
  }))

  return <NotificationsClient notifications={enriched} />
}
