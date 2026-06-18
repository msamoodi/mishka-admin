import { createServiceClient } from "@/lib/supabase/server"
import UsersClient from "./UsersClient"

export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const supabase = createServiceClient()

  const [profilesResult, authResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, avatar_url, rank, completed_courses_count")
      .order("created_at", { ascending: false }),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const authMap = new Map(
    (authResult.data?.users ?? []).map((u: { id: string; last_sign_in_at?: string | null }) => [u.id, u.last_sign_in_at ?? null])
  )

  type ProfileRow = { id: string; first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null; rank: string | null; completed_courses_count: number | null }
  const users = (profilesResult.data ?? [] as ProfileRow[]).map((p: ProfileRow) => ({
    ...p,
    last_sign_in_at: authMap.get(p.id) ?? null,
  }))

  return <UsersClient users={users} />
}
