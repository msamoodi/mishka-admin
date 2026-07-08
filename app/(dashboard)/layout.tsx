import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminSidebar from "./Sidebar"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { NotificationBell } from "@/components/NotificationBell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, first_name, last_name, email")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin) redirect("/login?error=unauthorized")

  return (
    <div className="min-h-screen flex">
      <AdminSidebar name={`${profile.first_name} ${profile.last_name}`.trim() || profile.email || "Admin"} />
      <main className="flex-1 min-w-0 bg-gray-50">
        <div className="sticky top-0 z-30 bg-gray-50 border-b border-gray-100 flex items-center px-8 h-12">
          <Breadcrumbs />
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
