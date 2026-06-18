"use client"
import { useState, forwardRef, useImperativeHandle } from "react"
import FolderImagePicker from "@/components/FolderImagePicker"

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

export type CourseFormHandle = {
  save: () => Promise<{ ok: boolean; id?: string; error?: string }>
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

const CourseForm = forwardRef<CourseFormHandle, { initial?: Partial<CourseFormData> }>(
  function CourseForm({ initial }, ref) {
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

    const set = (k: keyof CourseFormData, v: unknown) =>
      setForm(f => ({ ...f, [k]: v }))

    useImperativeHandle(ref, () => ({
      async save() {
        if (!form.course_name.trim()) return { ok: false, error: "Course name is required" }
        if (!form.slug.trim())        return { ok: false, error: "Slug is required" }

        const payload = {
          course_name:   form.course_name.trim(),
          slug:          form.slug.trim(),
          category:      form.category,
          level:         form.level,
          description:   form.description.trim(),
          time_to_read:  form.time_to_read,
          display_order: form.display_order,
          tags:          form.tags.split(",").map(t => t.trim()).filter(Boolean),
          thumbnail_url: form.thumbnail_url.trim() || null,
          is_published:  form.is_published,
        }

        const res  = await fetch("/api/admin/save-course", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(isEdit ? { id: form.id, ...payload } : payload),
        })
        const json = await res.json()

        if (!res.ok || json.error) return { ok: false, error: json.error || "Save failed" }
        return { ok: true, id: json.id }
      },
    }), [form, isEdit])

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5">

        <div className="grid grid-cols-2 gap-4">
          <Field label="Course Name" required>
            <input
              required
              value={form.course_name}
              onChange={e => {
                set("course_name", e.target.value)
                if (!isEdit) set("slug", slugify(e.target.value))
              }}
              className={INPUT}
              placeholder="Foundations of Human-Centered Design"
            />
          </Field>

          <Field label="Slug" required>
            <input
              required
              value={form.slug}
              onChange={e => set("slug", slugify(e.target.value))}
              className={INPUT}
              placeholder="foundations-of-hcd"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" required>
            <select required value={form.category} onChange={e => set("category", e.target.value)} className={INPUT}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>

          <Field label="Level" required>
            <select required value={form.level} onChange={e => set("level", e.target.value)} className={INPUT}>
              {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={e => set("description", e.target.value)}
            rows={3}
            className={INPUT + " resize-none h-auto py-2"}
            placeholder="Short course description shown to learners…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Time to Read (minutes)" required>
            <input
              type="number"
              required
              min={1}
              value={form.time_to_read}
              onChange={e => set("time_to_read", parseInt(e.target.value) || 0)}
              className={INPUT}
            />
          </Field>

          <Field label="Display Order">
            <input
              type="number"
              min={0}
              value={form.display_order}
              onChange={e => set("display_order", parseInt(e.target.value) || 0)}
              className={INPUT}
            />
          </Field>
        </div>

        <Field label="Tags (comma-separated)">
          <input
            value={form.tags}
            onChange={e => set("tags", e.target.value)}
            className={INPUT}
            placeholder="design, ux, research"
          />
        </Field>

        <Field label="Thumbnail">
          <FolderImagePicker
            value={form.thumbnail_url}
            onChange={v => set("thumbnail_url", v)}
            placeholder="/images/courses/product-design/thumbnail.png"
          />
        </Field>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={e => set("is_published", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 accent-gray-900"
          />
          <span className="text-sm font-medium text-gray-700">Published (visible to learners)</span>
        </label>
      </div>
    )
  }
)

export default CourseForm

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
