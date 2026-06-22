import webpush from "web-push"
import { createServiceClient } from "@/lib/supabase/server"

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function notifyUser(userId: string, headline: string, description?: string | null, ctaUrl?: string | null, ctaLabel?: string | null) {
  const supabase = createServiceClient()

  const { data: notification, error } = await supabase
    .from("notifications")
    .insert({ headline, description: description ?? null, cta_url: ctaUrl ?? null, cta_label: ctaLabel ?? null, segment: "single" })
    .select("id")
    .single()

  if (error || !notification) return

  await supabase.from("user_notifications").insert({ user_id: userId, notification_id: notification.id })

  const { data: subs } = await supabase.from("push_subscriptions").select("subscription").eq("user_id", userId)
  const payload = JSON.stringify({ title: headline, body: description ?? "", url: ctaUrl ?? "/notifications" })

  await Promise.allSettled(
    (subs ?? []).map((row: { subscription: string }) => {
      try {
        return webpush.sendNotification(JSON.parse(row.subscription), payload)
      } catch {
        return Promise.resolve()
      }
    })
  )
}
