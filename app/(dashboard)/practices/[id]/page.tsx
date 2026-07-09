import { notFound } from "next/navigation"
import { createServiceClient } from "@/lib/supabase/server"
import PracticeDetailClient from "./PracticeDetailClient"

export const dynamic = "force-dynamic"

type ProfileRow = { id: string; first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null }
type TaskRow    = { id: string; headline: string; brief: string; link_type: string }
type PathRow    = { id: string; title: string; career_levels: string[] | null }

export default async function PracticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: practice } = await supabase
    .from("user_path_practices")
    .select("id, user_id, career_path_id, task_id, submitted_link, submitted_at, reviewed_at, status, feedback, score, attempt_count")
    .eq("id", id)
    .single()

  if (!practice) notFound()

  const [profileRes, taskRes, pathRes] = await Promise.all([
    supabase.from("profiles").select("id, first_name, last_name, email, avatar_url").eq("id", practice.user_id).single(),
    practice.task_id
      ? supabase.from("path_practice_tasks").select("id, headline, brief, link_type").eq("id", practice.task_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("career_paths").select("id, title, career_levels").eq("id", practice.career_path_id).single(),
  ])

  return (
    <PracticeDetailClient
      practice={practice}
      profile={(profileRes.data ?? null) as ProfileRow | null}
      task={(taskRes.data ?? null) as TaskRow | null}
      path={(pathRes.data ?? null) as PathRow | null}
    />
  )
}
