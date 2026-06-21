import { createServiceClient } from "@/lib/supabase/server"
import NotificationsClient from "./NotificationsClient"

export default async function AdminNotificationsPage() {
  const supabase = createServiceClient()

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, headline, description, cta_url, cta_label, segment, created_at")
    .order("created_at", { ascending: false })

  type NotifRow = { id: string; headline: string; description: string | null; cta_url: string | null; cta_label: string | null; segment: string; created_at: string }
  type CountRow = { notification_id: string }

  const rows = (notifications ?? []) as NotifRow[]
  const ids = rows.map((n) => n.id)
  const { data: counts } = ids.length > 0
    ? await supabase.from("user_notifications").select("notification_id").in("notification_id", ids)
    : { data: [] as CountRow[] }

  const countMap: Record<string, number> = {}
  for (const row of (counts ?? []) as CountRow[]) {
    countMap[row.notification_id] = (countMap[row.notification_id] ?? 0) + 1
  }

  const enriched = rows.map((n) => ({ ...n, sent_count: countMap[n.id] ?? 0 }))

  return <NotificationsClient notifications={enriched} />
}
