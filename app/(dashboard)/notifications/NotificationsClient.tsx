"use client"
import { withBasePath } from "@/lib/basePath"
import { useState, useMemo } from "react"

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
  { value: "new_users",   label: "New Users (last 7 days)" },
]

const SEGMENT_LABEL: Record<string, string> = Object.fromEntries(SEGMENTS.map((s) => [s.value, s.label]))

function segmentDisplay(stored: string): string {
  return stored
    .split(",")
    .filter(Boolean)
    .map((s) => SEGMENT_LABEL[s] ?? s)
    .join(", ")
}

function storedToArray(stored: string): string[] {
  const parts = stored.split(",").filter(Boolean)
  return parts.length > 0 ? parts : ["all"]
}

export default function NotificationsClient({ notifications: initial }: { notifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initial)
  const [headline, setHeadline] = useState("")
  const [description, setDescription] = useState("")
  const [ctaUrl, setCtaUrl] = useState("")
  const [ctaLabel, setCtaLabel] = useState("")
  const [segments, setSegments] = useState<string[]>(["all"])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; sent?: number; error?: string } | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [resentMsg, setResentMsg] = useState<string | null>(null)

  const allSelected = notifications.length > 0 && selected.size === notifications.length

  const toggleSegment = (value: string) => {
    if (value === "all") {
      setSegments(["all"])
      return
    }
    setSegments((prev) => {
      const without = prev.filter((s) => s !== "all" && s !== value)
      if (prev.includes(value)) {
        return without.length > 0 ? without : ["all"]
      }
      return [...without, value]
    })
  }

  const segmentStr = segments.join(",")

  const resetForm = () => {
    setHeadline("")
    setDescription("")
    setCtaUrl("")
    setCtaLabel("")
    setSegments(["all"])
    setEditingId(null)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!headline.trim()) return
    setSending(true)
    setResult(null)

    if (editingId) {
      const res = await fetch(withBasePath("/api/admin/update-notification"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, headline, description, cta_url: ctaUrl, cta_label: ctaLabel, segments }),
      })
      const json = await res.json()
      setResult(json)
      if (json.ok) {
        setNotifications((prev) => prev.map((n) => n.id === editingId ? {
          ...n,
          headline: headline.trim(),
          description: description.trim() || null,
          cta_url: ctaUrl.trim() || null,
          cta_label: ctaLabel.trim() || null,
          segment: segmentStr,
        } : n))
        resetForm()
      }
      setSending(false)
      return
    }

    const res = await fetch(withBasePath("/api/admin/send-notification"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headline, description, cta_url: ctaUrl, cta_label: ctaLabel, segments }),
    })
    const json = await res.json()
    setResult(json)

    if (json.ok) {
      setNotifications((prev) => [{
        id: json.id ?? Date.now().toString(),
        headline: headline.trim(),
        description: description.trim() || null,
        cta_url: ctaUrl.trim() || null,
        cta_label: ctaLabel.trim() || null,
        segment: segmentStr,
        created_at: new Date().toISOString(),
        sent_count: json.sent ?? 0,
      }, ...prev])
      resetForm()
    }

    setSending(false)
  }

  const handleEdit = (n: Notification) => {
    setEditingId(n.id)
    setHeadline(n.headline)
    setDescription(n.description ?? "")
    setCtaUrl(n.cta_url ?? "")
    setCtaLabel(n.cta_label ?? "")
    setSegments(storedToArray(n.segment))
    setResult(null)
  }

  const handleResend = async (n: Notification) => {
    setResendingId(n.id)
    setResentMsg(null)
    const res = await fetch(withBasePath("/api/admin/send-notification"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: n.headline,
        description: n.description,
        cta_url: n.cta_url,
        cta_label: n.cta_label,
        segments: storedToArray(n.segment),
      }),
    })
    const json = await res.json()
    if (json.ok) {
      setNotifications((prev) => [{
        id: json.id ?? Date.now().toString(),
        headline: n.headline,
        description: n.description,
        cta_url: n.cta_url,
        cta_label: n.cta_label,
        segment: n.segment,
        created_at: new Date().toISOString(),
        sent_count: json.sent ?? 0,
      }, ...prev])
      setResentMsg(`Resent to ${json.sent} user${json.sent !== 1 ? "s" : ""}.`)
    } else {
      setResentMsg("Failed to resend.")
    }
    setResendingId(null)
    setTimeout(() => setResentMsg(null), 3000)
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(notifications.map((n) => n.id)))
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} notification${selected.size !== 1 ? "s" : ""}? This cannot be undone.`)) return
    setDeleting(true)
    const ids = [...selected]
    const res = await fetch(withBasePath("/api/admin/delete-notification"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
    if (res.ok) {
      setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)))
      setSelected(new Set())
      if (editingId && ids.includes(editingId)) resetForm()
    }
    setDeleting(false)
  }

  const segmentLabels = segments.map((s) => SEGMENT_LABEL[s] ?? s).join(", ")

  const preview = headline.trim() ? (
    <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Preview</p>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{headline.trim()}</p>
          <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1" />
        </div>
        {description.trim() && (
          <p className="text-xs text-gray-500 leading-relaxed">{description.trim()}</p>
        )}
        {ctaLabel.trim() && (
          <button className="self-start mt-1 text-xs font-semibold text-purple-600 flex items-center gap-1" disabled>
            {ctaLabel.trim()}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}
        <p className="text-[10px] text-gray-300 mt-0.5">Just now</p>
      </div>
      <p className="text-[10px] text-gray-400 mt-2 text-center">
        Sending to: <span className="font-medium text-gray-600">{segmentLabels}</span>
      </p>
    </div>
  ) : null

  const compose = useMemo(() => (
    <div className="flex flex-col gap-4">
    <form onSubmit={handleSend} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-sm">{editingId ? "Edit Notification" : "New Notification"}</h2>
        {editingId && (
          <button type="button" onClick={resetForm} className="text-xs text-gray-400 hover:text-gray-700">Cancel</button>
        )}
      </div>

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

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">User Segments</label>
        <div className="grid grid-cols-2 gap-1.5">
          {SEGMENTS.map((s) => (
            <label
              key={s.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                segments.includes(s.value)
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="checkbox"
                checked={segments.includes(s.value)}
                onChange={() => toggleSegment(s.value)}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-300"
              />
              <span className="text-xs text-gray-700">{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      {result && (
        <div className={`text-sm rounded-lg px-3 py-2 ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {result.ok
            ? (editingId ? "Notification updated." : `Sent to ${result.sent} user${result.sent !== 1 ? "s" : ""}.`)
            : result.error}
        </div>
      )}

      <button
        type="submit"
        disabled={sending || !headline.trim()}
        className="h-10 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
      >
        {sending ? (editingId ? "Saving…" : "Sending…") : (editingId ? "Save Changes" : "Send Notification")}
      </button>
    </form>
    {preview}
    </div>
  ), [headline, description, ctaUrl, ctaLabel, segments, sending, result, editingId])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send in-app notifications to users by segment.</p>
      </div>

      <div className="grid grid-cols-[420px_1fr] gap-6 items-start">
        {compose}

        {/* History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm">Sent Notifications</h2>
            <div className="flex items-center gap-3">
              {resentMsg && <span className="text-xs text-green-600">{resentMsg}</span>}
              {selected.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={deleting}
                  className="h-8 px-3 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "Deleting…" : `Delete (${selected.size})`}
                </button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing sent yet.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded border-gray-300" />
                    </th>
                    <th className="text-left px-2 py-3 font-medium text-gray-500">Notification</th>
                    <th className="text-left px-2 py-3 font-medium text-gray-500">Segment</th>
                    <th className="text-left px-2 py-3 font-medium text-gray-500">Recipients</th>
                    <th className="text-left px-2 py-3 font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((n) => (
                    <tr key={n.id} className={`border-b border-gray-50 last:border-0 transition-colors ${selected.has(n.id) ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(n.id)} onChange={() => toggleSelect(n.id)} className="rounded border-gray-300" />
                      </td>
                      <td className="px-2 py-3 max-w-[260px]">
                        <p className="font-medium text-gray-900 truncate">{n.headline}</p>
                        {n.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.description}</p>}
                      </td>
                      <td className="px-2 py-3 max-w-[180px]">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 truncate max-w-full">{segmentDisplay(n.segment)}</span>
                      </td>
                      <td className="px-2 py-3 text-gray-500">{n.sent_count}</td>
                      <td className="px-2 py-3 text-gray-400 text-xs">
                        {new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => handleEdit(n)} className="text-xs font-medium text-gray-600 hover:text-gray-900 mr-3">
                          Edit
                        </button>
                        <button
                          onClick={() => handleResend(n)}
                          disabled={resendingId === n.id}
                          className="text-xs font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600 disabled:opacity-50"
                        >
                          {resendingId === n.id ? "Sending…" : "Resend"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
