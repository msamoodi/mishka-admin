import { createServiceClient } from "@/lib/supabase/server"
import PracticesClient, { type PracticeItem } from "./PracticesClient"

export const dynamic = "force-dynamic"

type RawPractice = {
  id: string
  user_id: string
  career_path_id: string
  submitted_link: string | null
  submitted_at: string | null
  attempt_count: number
  path_practice_tasks: { headline: string; brief: string; link_type: string } | null
  career_paths: { title: string } | null
}

export default async function PracticesPage() {
  const supabase = createServiceClient()

  const { data: raw } = await supabase
    .from("user_path_practices")
    .select("id, user_id, career_path_id, submitted_link, submitted_at, attempt_count, path_practice_tasks(headline, brief, link_type), career_paths(title)")
    .eq("status", "pending_review")
    .order("submitted_at", { ascending: true })

  const rawPractices = (raw ?? []) as RawPractice[]

  const userIds = [...new Set(rawPractices.map((p) => p.user_id))]
  const { data: profileRows } = userIds.length > 0
    ? await supabase.from("profiles").select("id, first_name, last_name, email, avatar_url").in("id", userIds)
    : { data: [] }

  type ProfileRow = { id: string; first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null }
  const profileMap = Object.fromEntries((profileRows ?? []).map((p: ProfileRow) => [p.id, p]))

  const practices: PracticeItem[] = rawPractices.map((p) => ({
    ...p,
    profile: (profileMap[p.user_id] as PracticeItem["profile"]) ?? null,
  }))

  return <PracticesClient practices={practices} />
}
