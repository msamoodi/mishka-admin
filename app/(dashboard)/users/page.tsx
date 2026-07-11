import { createServiceClient } from "@/lib/supabase/server"
import UsersClient from "./UsersClient"

export const revalidate = 120  // 2-min cache — avoids re-fetching all users on every visit

export default async function UsersPage() {
  const supabase = createServiceClient()

  const [profilesResult, authResult, pendingPracticesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, avatar_url, rank, completed_courses_count, last_seen_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase
      .from("user_path_practices")
      .select("user_id")
      .eq("status", "pending_review"),
  ])

  const authMap = new Map(
    (authResult.data?.users ?? []).map((u: { id: string; last_sign_in_at?: string | null }) => [u.id, u.last_sign_in_at ?? null])
  )

  const pendingPracticeUserIds = new Set(
    (pendingPracticesResult.data ?? []).map((r: { user_id: string }) => r.user_id)
  )

  type ProfileRow = { id: string; first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null; rank: string | null; completed_courses_count: number | null; last_seen_at: string | null }
  const users = (profilesResult.data ?? [] as ProfileRow[]).map((p: ProfileRow) => ({
    ...p,
    last_sign_in_at: authMap.get(p.id) ?? null,
    has_pending_practice: pendingPracticeUserIds.has(p.id),
  }))

  return <UsersClient users={users} />
}
