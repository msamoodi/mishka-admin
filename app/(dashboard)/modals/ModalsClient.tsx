"use client"
import { useState } from "react"
import ImageUploader from "@/components/ImageUploader"
import MediaUploader from "@/components/MediaUploader"
import { withBasePath, resolveAppUrl } from "@/lib/basePath"

const SHOW_RULES = [
  { value: "always",           label: "Every session (always show)" },
  { value: "once_per_day",     label: "Once per day" },
  { value: "once_per_session", label: "Once per browser session" },
  { value: "once_per_login",   label: "Once per login" },
  { value: "once_ever",        label: "Once ever (never show again after dismiss)" },
  { value: "every_n_days",     label: "Every N days" },
  { value: "n_times_total",    label: "Maximum N times total" },
]

type ModalType = "bt_modal" | "mid_popup"

type AppModal = {
  id: string
  is_active: boolean
  modal_type: ModalType
  headline: string
  headline_size: number
  headline_color: string
  sub_headline: string
  sub_headline_size: number
  sub_headline_color: string
  description: string
  description_size: number
  description_color: string
  cta_label: string
  cta_url: string | null
  cta2_label: string | null
  cta2_url: string | null
  background_image_url: string | null
  media_url: string | null
  show_rule: string
  rule_value: number | null
  expires_at: string | null
  created_at: string
}

const EMPTY_BT: Omit<AppModal, "id" | "is_active" | "created_at"> = {
  modal_type: "bt_modal",
  headline: "",
  headline_size: 38,
  headline_color: "#ffffff",
  sub_headline: "",
  sub_headline_size: 18,
  sub_headline_color: "#ffffff",
  description: "",
  description_size: 14,
  description_color: "#ffffff",
  cta_label: "Start Exploring",
  cta_url: "",
  cta2_label: null,
  cta2_url: null,
  background_image_url: null,
  media_url: null,
  show_rule: "once_per_day",
  rule_value: null,
  expires_at: null,
}

const EMPTY_MID: Omit<AppModal, "id" | "is_active" | "created_at"> = {
  modal_type: "mid_popup",
  headline: "",
  headline_size: 22,
  headline_color: "#111111",
  sub_headline: "",
  sub_headline_size: 16,
  sub_headline_color: "#111111",
  description: "",
  description_size: 14,
  description_color: "#555555",
  cta_label: "Get Started",
  cta_url: "",
  cta2_label: "",
  cta2_url: "",
  background_image_url: null,
  media_url: null,
  show_rule: "once_per_day",
  rule_value: null,
  expires_at: null,
}

export default function ModalsClient({ modals: initial }: { modals: AppModal[] }) {
  const [modals, setModals] = useState(initial)
  const [editing, setEditing] = useState<AppModal | null>(null)
  const [form, setForm] = useState<Omit<AppModal, "id" | "is_active" | "created_at">>(EMPTY_BT)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const isEditing = !!editing
  const isMid = form.modal_type === "mid_popup"

  function startNew() {
    setEditing(null)
    setForm(EMPTY_BT)
    setError("")
    setSuccess("")
  }

  function startEdit(m: AppModal) {
    setEditing(m)
    setForm({
      modal_type: m.modal_type ?? "bt_modal",
      headline: m.headline,
      headline_size: m.headline_size,
      headline_color: m.headline_color,
      sub_headline: m.sub_headline,
      sub_headline_size: m.sub_headline_size,
      sub_headline_color: m.sub_headline_color,
      description: m.description,
      description_size: m.description_size,
      description_color: m.description_color,
      cta_label: m.cta_label,
      cta_url: m.cta_url ?? "",
      cta2_label: m.cta2_label ?? "",
      cta2_url: m.cta2_url ?? "",
      background_image_url: m.background_image_url,
      media_url: m.media_url,
      show_rule: m.show_rule,
      rule_value: m.rule_value,
      expires_at: m.expires_at ? m.expires_at.slice(0, 10) : null,
    })
    setError("")
    setSuccess("")
  }

  function set<K extends keyof typeof EMPTY_BT>(key: K, value: (typeof EMPTY_BT)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function switchType(type: ModalType) {
    const base = type === "mid_popup" ? EMPTY_MID : EMPTY_BT
    setForm((f) => ({ ...base, headline: f.headline, description: f.description, cta_label: f.cta_label, cta_url: f.cta_url, show_rule: f.show_rule, rule_value: f.rule_value, expires_at: f.expires_at }))
  }

  const needsRuleValue = form.show_rule === "every_n_days" || form.show_rule === "n_times_total"

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")

    const res = await fetch(withBasePath("/api/admin/save-modal"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing?.id,
        ...form,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        rule_value: needsRuleValue ? form.rule_value : null,
      }),
    })
    const json = await res.json()
    setSaving(false)

    if (!json.ok) { setError(json.error ?? "Save failed"); return }

    if (editing) {
      setModals((prev) => prev.map((m) => (m.id === editing.id ? json.modal : m)))
      setEditing(json.modal)
    } else {
      setModals((prev) => [json.modal, ...prev])
      startNew()
    }
    setSuccess(editing ? "Saved." : "Modal created.")
  }

  async function handleToggle(m: AppModal) {
    const next = !m.is_active
    setTogglingId(m.id)
    const res = await fetch(withBasePath("/api/admin/toggle-modal"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id, active: next }),
    })
    const json = await res.json()
    setTogglingId(null)
    if (!json.ok) return
    setModals((prev) =>
      prev.map((item) =>
        item.id === m.id
          ? { ...item, is_active: next }
          : next
          ? { ...item, is_active: false }
          : item
      )
    )
    if (editing?.id === m.id) setEditing((e) => e && { ...e, is_active: next })
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this modal? This cannot be undone.")) return
    setDeletingId(id)
    const res = await fetch(withBasePath("/api/admin/delete-modal"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setModals((prev) => prev.filter((m) => m.id !== id))
      if (editing?.id === id) startNew()
    }
    setDeletingId(null)
  }

  const labelCls = "text-xs font-medium text-gray-500 uppercase tracking-wide"
  const inputCls = "h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 w-full"
  const rowCls = "flex flex-col gap-1.5"

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">App Modals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Promotional modals shown on the Mishka app home screen. Only one can be active at a time.</p>
        </div>
        <button
          onClick={startNew}
          className="h-9 px-4 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-colors"
        >
          + New Modal
        </button>
      </div>

      <div className="grid grid-cols-[400px_1fr] gap-6 items-start">

        {/* ── Form ── */}
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5 sticky top-16">
          <h2 className="font-semibold text-gray-900 text-sm">{isEditing ? "Edit Modal" : "New Modal"}</h2>

          {/* Modal Type Selector */}
          <div className={rowCls}>
            <span className={labelCls}>Modal Style</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => switchType("bt_modal")}
                className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                  !isMid ? "border-gray-900 bg-gray-50 text-gray-900" : "border-gray-200 text-gray-400 hover:border-gray-300"
                }`}
              >
                <div className="w-full h-8 rounded-md bg-gray-700 relative overflow-hidden flex items-end justify-center pb-1">
                  <div className="w-5/6 h-4 rounded-t bg-gray-900 opacity-80" />
                </div>
                <span>BT Modal</span>
                <span className="text-[10px] font-normal text-gray-400">Slides up from bottom</span>
              </button>
              <button
                type="button"
                onClick={() => switchType("mid_popup")}
                className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                  isMid ? "border-gray-900 bg-gray-50 text-gray-900" : "border-gray-200 text-gray-400 hover:border-gray-300"
                }`}
              >
                <div className="w-full h-8 rounded-md bg-gray-100 relative flex items-center justify-center">
                  <div className="w-4/5 h-5 rounded bg-white shadow border border-gray-200" />
                </div>
                <span>Mid Popup</span>
                <span className="text-[10px] font-normal text-gray-400">Card in the middle</span>
              </button>
            </div>
          </div>

          {/* Headline */}
          <div className="flex flex-col gap-2">
            <span className={labelCls}>Headline <span className="text-red-400">*</span></span>
            <input
              value={form.headline}
              onChange={(e) => set("headline", e.target.value)}
              placeholder={isMid ? "Discover your next course" : "Mishka !"}
              className={inputCls}
              required
            />
            {!isMid && (
              <div className="flex gap-2">
                <div className={`${rowCls} flex-1`}>
                  <span className={labelCls}>Size (px)</span>
                  <input type="number" min={12} max={80} value={form.headline_size} onChange={(e) => set("headline_size", Number(e.target.value))} className={inputCls} />
                </div>
                <div className={`${rowCls} flex-shrink-0`}>
                  <span className={labelCls}>Color</span>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.headline_color} onChange={(e) => set("headline_color", e.target.value)} className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
                    <input value={form.headline_color} onChange={(e) => set("headline_color", e.target.value)} className="h-10 px-2 rounded-lg border border-gray-200 text-xs w-24 focus:outline-none focus:ring-2 focus:ring-gray-300" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sub-headline — BT Modal only */}
          {!isMid && (
            <div className="flex flex-col gap-2">
              <span className={labelCls}>Sub-headline</span>
              <input
                value={form.sub_headline}
                onChange={(e) => set("sub_headline", e.target.value)}
                placeholder="Welcomes You to Early Access"
                className={inputCls}
              />
              <div className="flex gap-2">
                <div className={`${rowCls} flex-1`}>
                  <span className={labelCls}>Size (px)</span>
                  <input type="number" min={12} max={60} value={form.sub_headline_size} onChange={(e) => set("sub_headline_size", Number(e.target.value))} className={inputCls} />
                </div>
                <div className={`${rowCls} flex-shrink-0`}>
                  <span className={labelCls}>Color</span>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.sub_headline_color} onChange={(e) => set("sub_headline_color", e.target.value)} className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
                    <input value={form.sub_headline_color} onChange={(e) => set("sub_headline_color", e.target.value)} className="h-10 px-2 rounded-lg border border-gray-200 text-xs w-24 focus:outline-none focus:ring-2 focus:ring-gray-300" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-2">
            <span className={labelCls}>Description</span>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={isMid ? "A short line about what's inside…" : "Thanks for joining us at the beginning of our journey…"}
              rows={3}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
            />
            {!isMid && (
              <div className="flex gap-2">
                <div className={`${rowCls} flex-1`}>
                  <span className={labelCls}>Size (px)</span>
                  <input type="number" min={10} max={24} value={form.description_size} onChange={(e) => set("description_size", Number(e.target.value))} className={inputCls} />
                </div>
                <div className={`${rowCls} flex-shrink-0`}>
                  <span className={labelCls}>Color</span>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.description_color} onChange={(e) => set("description_color", e.target.value)} className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
                    <input value={form.description_color} onChange={(e) => set("description_color", e.target.value)} className="h-10 px-2 rounded-lg border border-gray-200 text-xs w-24 focus:outline-none focus:ring-2 focus:ring-gray-300" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CTA 1 — Primary */}
          <div className="flex flex-col gap-1.5">
            <span className={labelCls}>{isMid ? "CTA 1 — Primary (gradient button)" : "CTA"}</span>
            <div className="grid grid-cols-2 gap-3">
              <div className={rowCls}>
                <span className={labelCls}>Label</span>
                <input value={form.cta_label} onChange={(e) => set("cta_label", e.target.value)} placeholder={isMid ? "Get Started" : "Start Exploring"} className={inputCls} />
              </div>
              <div className={rowCls}>
                <span className={labelCls}>URL (optional)</span>
                <input value={form.cta_url ?? ""} onChange={(e) => set("cta_url", e.target.value)} placeholder="/courses" className={inputCls} />
              </div>
            </div>
          </div>

          {/* CTA 2 — Secondary (Mid Popup only) */}
          {isMid && (
            <div className="flex flex-col gap-1.5">
              <span className={labelCls}>CTA 2 — Secondary (text link, optional)</span>
              <div className="grid grid-cols-2 gap-3">
                <div className={rowCls}>
                  <span className={labelCls}>Label</span>
                  <input value={form.cta2_label ?? ""} onChange={(e) => set("cta2_label", e.target.value || null)} placeholder="Maybe later" className={inputCls} />
                </div>
                <div className={rowCls}>
                  <span className={labelCls}>URL (optional)</span>
                  <input value={form.cta2_url ?? ""} onChange={(e) => set("cta2_url", e.target.value || null)} placeholder="/profile" className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {/* Media — Mid Popup */}
          {isMid && (
            <div className={rowCls}>
              <span className={labelCls}>Media (Image or Video)</span>
              <p className="text-[11px] text-gray-400 -mt-0.5">Shown at the top of the popup. Upload an image or mp4 video.</p>
              <MediaUploader
                value={form.media_url ?? ""}
                onChange={(url) => set("media_url", url || null)}
                folder="modals"
              />
            </div>
          )}

          {/* Background Image — BT Modal */}
          {!isMid && (
            <div className={rowCls}>
              <span className={labelCls}>Background Image</span>
              <ImageUploader
                value={form.background_image_url ?? ""}
                onChange={(url) => set("background_image_url", url || null)}
                folder="modals"
              />
            </div>
          )}

          {/* Show rule */}
          <div className="flex flex-col gap-2">
            <div className={rowCls}>
              <span className={labelCls}>Show Rule</span>
              <select value={form.show_rule} onChange={(e) => set("show_rule", e.target.value)} className={inputCls}>
                {SHOW_RULES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            {needsRuleValue && (
              <div className={rowCls}>
                <span className={labelCls}>
                  {form.show_rule === "every_n_days" ? "Every N days (N =)" : "Max show count (N =)"}
                </span>
                <input
                  type="number"
                  min={1}
                  value={form.rule_value ?? ""}
                  onChange={(e) => set("rule_value", e.target.value ? Number(e.target.value) : null)}
                  className={inputCls}
                  placeholder="e.g. 3"
                />
              </div>
            )}
          </div>

          {/* Expiry */}
          <div className={rowCls}>
            <span className={labelCls}>Expires On (optional)</span>
            <input
              type="date"
              value={form.expires_at ?? ""}
              onChange={(e) => set("expires_at", e.target.value || null)}
              className={inputCls}
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

          <div className="flex gap-3">
            {isEditing && (
              <button type="button" onClick={startNew} className="flex-1 h-10 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-10 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {saving ? "Saving…" : isEditing ? "Save Changes" : "Create Modal"}
            </button>
          </div>
        </form>

        {/* ── List ── */}
        <div>
          <h2 className="font-semibold text-gray-900 text-sm mb-3">All Modals</h2>
          {modals.length === 0 ? (
            <p className="text-sm text-gray-400">No modals yet. Create one using the form.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {modals.map((m) => {
                const thumbUrl = m.modal_type === "mid_popup" ? m.media_url : m.background_image_url
                const isVideoThumb = thumbUrl && (thumbUrl.toLowerCase().endsWith(".mp4") || thumbUrl.includes("/videos/"))
                return (
                  <div
                    key={m.id}
                    className={`bg-white rounded-xl border p-4 flex gap-4 items-start transition-colors ${
                      editing?.id === m.id ? "border-gray-400" : "border-gray-200"
                    }`}
                  >
                    {/* Thumbnail */}
                    {isVideoThumb ? (
                      <div className="w-16 h-16 rounded-lg bg-gray-800 flex-shrink-0 flex items-center justify-center text-2xl">▶</div>
                    ) : thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveAppUrl(thumbUrl)}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-2xl">
                        {m.modal_type === "mid_popup" ? "🪟" : "🖼️"}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            m.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {m.is_active ? "● Active" : "○ Inactive"}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          m.modal_type === "mid_popup" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                        }`}>
                          {m.modal_type === "mid_popup" ? "Mid Popup" : "BT Modal"}
                        </span>
                        {m.expires_at && (
                          <span className="text-[10px] text-gray-400">
                            Expires {new Date(m.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm truncate">{m.headline || "(no headline)"}</p>
                      {m.sub_headline && m.modal_type !== "mid_popup" && <p className="text-xs text-gray-500 truncate">{m.sub_headline}</p>}
                      <p className="text-[11px] text-gray-400 mt-1">
                        {SHOW_RULES.find((r) => r.value === m.show_rule)?.label ?? m.show_rule}
                        {m.rule_value != null ? ` · N = ${m.rule_value}` : ""}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                      <button
                        onClick={() => handleToggle(m)}
                        disabled={togglingId === m.id}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          m.is_active
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {togglingId === m.id ? "…" : m.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => startEdit(m)}
                        className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                        className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        {deletingId === m.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
