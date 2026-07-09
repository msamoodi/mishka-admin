import { createServiceClient } from "@/lib/supabase/server"
import PracticesClient, { type PracticeItem } from "./PracticesClient"

export const dynamic = "force-dynamic"

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar_url: string | null
}

export default async function PracticesPage() {
  const supabase = createServiceClient()

  // Step 1: fetch pending practices — no joins, so missing columns can't break it
  const { data: practiceRows, error: practiceErr } = await supabase
    .from("user_path_practices")
    .select("id, user_id, career_path_id, task_id, submitted_link, submitted_at, attempt_count")
    .eq("status", "pending_review")
    .order("submitted_at", { ascending: true })

  if (practiceErr) console.error("[practices] fetch error:", practiceErr.message)

  type PracticeRow = { id: string; user_id: string; career_path_id: string; task_id: string; submitted_link: string | null; submitted_at: string | null; attempt_count: number }
  const rows = (practiceRows ?? []) as PracticeRow[]
  if (rows.length === 0) return <PracticesClient practices={[]} />

  // Step 2: fetch related data in parallel
  const userIds    = [...new Set(rows.map((r: PracticeRow) => r.user_id))]
  const taskIds    = [...new Set(rows.map((r: PracticeRow) => r.task_id).filter(Boolean))]
  const pathIds    = [...new Set(rows.map((r: PracticeRow) => r.career_path_id).filter(Boolean))]

  const [profilesRes, tasksRes, pathsRes] = await Promise.all([
    supabase.from("profiles").select("id, first_name, last_name, email, avatar_url").in("id", userIds),
    taskIds.length > 0
      ? supabase.from("path_practice_tasks").select("id, headline, brief, link_type").in("id", taskIds)
      : Promise.resolve({ data: [] }),
    pathIds.length > 0
      ? supabase.from("career_paths").select("id, title").in("id", pathIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = Object.fromEntries(((profilesRes.data ?? []) as ProfileRow[]).map((p) => [p.id, p]))
  const taskMap    = Object.fromEntries((tasksRes.data ?? []).map((t: { id: string; headline: string; brief: string; link_type?: string }) => [t.id, t]))
  const pathMap    = Object.fromEntries((pathsRes.data ?? []).map((p: { id: string; title: string }) => [p.id, p]))

  const practices: PracticeItem[] = rows.map((r: PracticeRow) => ({
    id:             r.id,
    user_id:        r.user_id,
    career_path_id: r.career_path_id,
    submitted_link: r.submitted_link,
    submitted_at:   r.submitted_at,
    attempt_count:  r.attempt_count ?? 1,
    path_practice_tasks: taskMap[r.task_id]
      ? { headline: taskMap[r.task_id].headline, brief: taskMap[r.task_id].brief, link_type: taskMap[r.task_id].link_type ?? "figma" }
      : null,
    career_paths: pathMap[r.career_path_id] ? { title: pathMap[r.career_path_id].title } : null,
    profile: (profileMap[r.user_id] as PracticeItem["profile"]) ?? null,
  }))

  return <PracticesClient practices={practices} />
}
