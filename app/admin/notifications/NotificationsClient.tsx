"use client"
import { useState } from "react"

type Notification = {
  id: string
  headline: string
  description: string | null
  cta_url: string | null
  cta_label: string | null
  segment: string
  created_at: string
  sent_count: number
}

const SEGMENTS = [
  { value: "all",         label: "All Users" },
  { value: "active",      label: "Active (last 24h)" },
  { value: "semi_active", label: "Semi-Active (1–3 days)" },
  { value: "not_active",  label: "Not Active (3–7 days)" },
  { value: "deactivated", label: "Deactivated (10+ days)" },
]

const SEGMENT_LABEL: Record<string, string> = Object.fromEntries(SEGMENTS.map((s) => [s.value, s.label]))

export default function NotificationsClient({ notifications: initial }: { notifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initial)
  const [headline, setHeadline] = useState("")
  const [description, setDescription] = useState("")
  const [ctaUrl, setCtaUrl] = useState("")
  const [ctaLabel, setCtaLabel] = useState("")
  const [segment, setSegment] = useState("all")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; sent?: number; error?: string } | null>(null)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!headline.trim()) return
    setSending(true)
    setResult(null)

    const res = await fetch("/api/admin/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headline, description, cta_url: ctaUrl, cta_label: ctaLabel, segment }),
    })
    const json = await res.json()
    setResult(json)

    if (json.ok) {
      setNotifications((prev) => [{
        id: Date.now().toString(),
        headline: headline.trim(),
        description: description.trim() || null,
        cta_url: ctaUrl.trim() || null,
        cta_label: ctaLabel.trim() || null,
        segment,
        created_at: new Date().toISOString(),
        sent_count: json.sent ?? 0,
      }, ...prev])
      setHeadline("")
      setDescription("")
      setCtaUrl("")
      setCtaLabel("")
      setSegment("all")
    }

    setSending(false)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send in-app notifications to users by segment.</p>
      </div>

      <div className="grid grid-cols-[420px_1fr] gap-6 items-start">
        {/* Compose form */}
        <form onSubmit={handleSend} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-gray-900 text-sm">New Notification</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Headline <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="E.g. New courses added!"
              required
              className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional body text…"
              rows={3}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">CTA Label</label>
              <input
                type="text"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="E.g. View Course"
                className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">CTA URL</label>
              <input
                type="text"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="/courses or https://…"
                className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">User Segment</label>
            <div className="relative">
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 appearance-none"
              >
                {SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {result && (
            <div className={`text-sm rounded-lg px-3 py-2 ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {result.ok ? `Sent to ${result.sent} user${result.sent !== 1 ? "s" : ""}.` : result.error}
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !headline.trim()}
            className="h-10 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {sending ? "Sending…" : "Send Notification"}
          </button>
        </form>

        {/* History */}
        <div>
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Sent Notifications</h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing sent yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {notifications.map((n) => (
                <div key={n.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{n.headline}</p>
                      {n.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.description}</p>}
                      {n.cta_label && n.cta_url && (
                        <p className="text-xs text-gray-400 mt-1">CTA: {n.cta_label} → {n.cta_url}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{SEGMENT_LABEL[n.segment] ?? n.segment}</span>
                      <p className="text-xs text-gray-400 mt-1">{n.sent_count} recipients</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 mt-2">
                    {new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
