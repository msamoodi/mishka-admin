import { createServiceClient } from "@/lib/supabase/server"
import TicketsClient from "./TicketsClient"

export const dynamic = "force-dynamic"

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

type Ticket = {
  id: string
  subject: string
  message: string
  status: string
  created_at: string
  user_id: string | null
  profiles: ProfileRow | null
}

export default async function TicketsPage() {
  const supabase = createServiceClient()

  // Single query with join — eliminates the sequential profiles fetch
  const { data, error } = await supabase
    .from("tickets")
    .select("id, subject, message, status, created_at, user_id, profiles(id, first_name, last_name, email)")
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) {
    console.error("[tickets]", error)
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Support Tickets</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <strong>Database error:</strong> {error.message}
        </div>
      </div>
    )
  }

  return <TicketsClient tickets={(data ?? []) as unknown as Ticket[]} />
}
