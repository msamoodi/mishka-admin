"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const LABELS: Record<string, string> = {
  "courses":       "Courses",
  "categories":    "Categories",
  "career-paths":  "Career Paths",
  "users":         "Users",
  "tickets":       "Tickets",
  "notifications": "Notifications",
  "banners":       "Banners",
  "lessons":       "Lessons",
  "new":           "New",
  "import":        "Import",
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) return null

  type Crumb = { label: string; href: string }
  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/" }]

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const href = "/" + segments.slice(0, i + 1).join("/")
    const label = LABELS[seg] ?? (seg.length === 36 && seg.includes("-") ? "Detail" : seg)
    crumbs.push({ label, href })
  }

  if (crumbs.length <= 1) return null

  return (
    <nav className="flex items-center gap-1.5 px-8 pt-5 pb-0 text-xs text-gray-400">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={c.href} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">/</span>}
            {isLast ? (
              <span className="text-gray-600 font-medium">{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:text-gray-700 transition-colors">
                {c.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
