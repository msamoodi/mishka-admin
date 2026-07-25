"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const NAV = [
  { label: "Dashboard",      href: "/",               icon: "📊" },
  { label: "Courses",        href: "/courses",        icon: "📚" },
  { label: "Categories",     href: "/categories",     icon: "🏷️" },
  { label: "Learning Paths", href: "/career-paths",   icon: "🗺️" },
  { label: "Users",          href: "/users",          icon: "👥" },
  { label: "Practices",      href: "/practices",      icon: "📝" },
  { label: "Tickets",        href: "/tickets",        icon: "🎫" },
  { label: "Notifications",  href: "/notifications",  icon: "🔔" },
  { label: "Banner Sliders", href: "/banners",        icon: "🖼️" },
  { label: "App Modals",     href: "/modals",         icon: "💬" },
  { label: "AI Books",       href: "/ai/books",       icon: "🤖" },
  { label: "AI Generate",    href: "/ai/generate",    icon: "✨" },
]

export default function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [openTickets, setOpenTickets] = useState(0)
  const [pendingPractices, setPendingPractices] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    const fetchCounts = () => Promise.all([
      supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("user_path_practices").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    ]).then(([tickets, practices]) => {
      setOpenTickets(tickets.count ?? 0)
      setPendingPractices(practices.count ?? 0)
    })

    fetchCounts()
    const interval = setInterval(fetchCounts, 60_000)
    return () => clearInterval(interval)
  }, [])  // run once, poll every 60 s instead of on every navigation

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0 min-h-screen">
      <div className="px-5 py-5 border-b border-gray-100">
        <p className="font-bold text-gray-900 text-sm">Mishka Admin</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{name}</p>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = item.href === "/"
          ? pathname === "/"
          : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === "/tickets" && openTickets > 0 && (
                <span
                  className="inline-flex items-center justify-center rounded-full text-white text-[10px] font-semibold leading-none"
                  style={{ background: "#FF2B4C", minWidth: 18, height: 18, padding: "0 5px" }}
                >
                  {openTickets}
                </span>
              )}
              {item.href === "/practices" && pendingPractices > 0 && (
                <span
                  className="inline-flex items-center justify-center rounded-full text-[10px] font-semibold leading-none bg-amber-500 text-white"
                  style={{ minWidth: 18, height: 18, padding: "0 5px" }}
                >
                  {pendingPractices}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <span>🚪</span>
          Sign out
        </button>
      </div>
    </aside>
  )
}
