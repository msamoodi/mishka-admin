"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const NAV = [
  { label: "Courses", href: "/admin/courses", icon: "📚" },
]

export default function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname()
  const router = useRouter()

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
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
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
