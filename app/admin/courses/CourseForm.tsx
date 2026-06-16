"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type CourseFormData = {
  id?: string
  course_name: string
  slug: string
  category: string
  level: string
  description: string
  time_to_read: number
  display_order: number
  tags: string
  thumbnail_url: string
  is_published: boolean
}

const CATEGORIES = [
  { value: "product-design",       label: "Product Design" },
  { value: "digital-marketing",    label: "Digital Marketing" },
  { value: "branding-design",      label: "Branding Design" },
  { value: "user-research",        label: "User Research" },
  { value: "data-and-ai-literacy", label: "Data & AI Literacy" },
]

const LEVELS = [
  { value: "basic",        label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced",     label: "Advanced" },
]

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export default function CourseForm({ initial }: { initial?: Partial<CourseFormData> }) {
  const router = useRouter()
  const isEdit = !!initial?.id

  const [form, setForm] = useState<CourseFormData>({
    id:            initial?.id,
    course_name:   initial?.course_name   ?? "",
    slug:          initial?.slug          ?? "",
    category:      initial?.category      ?? "product-design",
    level:         initial?.level         ?? "basic",
    description:   initial?.description   ?? "",
    time_to_read:  initial?.time_to_read  ?? 30,
    display_order: initial?.display_order ?? 0,
    tags:          (initial as any)?.tags ? (initial as any).tags.join(", ") : "",
    thumbnail_url: initial?.thumbnail_url ?? "",
    is_published:  initial?.is_published  ?? false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  const set = (k: keyof CourseFormData, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const payload = {
      course_name:   form.course_name.trim(),
      slug:          form.slug.trim(),
      category:      form.category,
      level:         form.level,
      description:   form.description.trim(),
      time_to_read:  form.time_to_read,
      display_order: form.display_order,
      tags:          form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      thumbnail_url: form.thumbnail_url.trim() || null,
      is_published:  form.is_published,
    }

    const supabase = createClient()
    if (isEdit) {
      const { error: err } = await supabase.from("courses").update(payload).eq("id", form.id!)
      if (err) { setError(err.message); setLoading(false); return }
    } else {
      const { error: err } = await supabase.from("courses").insert(payload)
      if (err) { setError(err.message); setLoading(false); return }
    }

    router.push("/admin/courses")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5">

        <div className="grid grid-cols-2 gap-4">
          <Field label="Course Name" required>
            <input
              required value={form.course_name} onChange={(e) => {
                set("course_name", e.target.value)
                if (!isEdit) set("slug", slugify(e.target.value))
              }}
              className={INPUT}
              placeholder="Foundations of Human-Centered Design"
            />
          </Field>

          <Field label="Slug" required>
            <input required value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} className={INPUT} placeholder="foundations-of-hcd" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" required>
            <select required value={form.category} onChange={(e) => set("category", e.target.value)} className={INPUT}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>

          <Field label="Level" required>
            <select required value={form.level} onChange={(e) => set("level", e.target.value)} className={INPUT}>
              {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className={INPUT + " resize-none"} placeholder="Short course description shown to learners…" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Time to Read (minutes)" required>
            <input type="number" required min={1} value={form.time_to_read} onChange={(e) => set("time_to_read", parseInt(e.target.value) || 0)} className={INPUT} />
          </Field>

          <Field label="Display Order">
            <input type="number" min={0} value={form.display_order} onChange={(e) => set("display_order", parseInt(e.target.value) || 0)} className={INPUT} />
          </Field>
        </div>

        <Field label="Tags (comma-separated)">
          <input value={form.tags} onChange={(e) => set("tags", e.target.value)} className={INPUT} placeholder="design, ux, research" />
        </Field>

        <Field label="Thumbnail URL">
          <input value={form.thumbnail_url} onChange={(e) => set("thumbnail_url", e.target.value)} className={INPUT} placeholder="https://…" />
        </Field>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(e) => set("is_published", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 accent-gray-900"
          />
          <span className="text-sm font-medium text-gray-700">Published (visible to learners)</span>
        </label>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button type="submit" disabled={loading} className="h-9 px-5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Course"}
        </button>
        <button type="button" onClick={() => router.push("/admin/courses")} className="h-9 px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

const INPUT = "w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
