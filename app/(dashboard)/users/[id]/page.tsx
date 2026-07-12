import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import UserDetailClient, { type PracticeSubmission } from "./UserDetailClient"

export const dynamic = "force-dynamic"

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [profileResult, authResult, userCoursesResult, allPathsResult, practicesResult, certsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.auth.admin.getUserById(id),
    supabase
      .from("user_courses")
      .select("course_id, status, progress_percent, last_accessed_at, completed_at, courses(id, course_name, slug, thumbnail_url)")
      .eq("user_id", id)
      .order("last_accessed_at", { ascending: false }),
    supabase
      .from("career_paths")
      .select("id, title, area, career_levels")
      .eq("is_published", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("user_path_practices")
      .select("id, career_path_id, task_id, submitted_link, submitted_at, status, feedback, score, reviewed_at, attempt_count, path_practice_tasks(headline, brief), career_paths(title)")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_path_certificates")
      .select("career_path_id, career_path_title, score, issued_at")
      .eq("user_id", id)
      .order("issued_at", { ascending: false }),
  ])

  if (!profileResult.data) notFound()

  const authUser = authResult.data?.user ?? null
  const incompleted = (userCoursesResult.data ?? []).filter((c: { status: string }) => c.status !== "completed").length
  const completed   = (userCoursesResult.data ?? []).filter((c: { status: string }) => c.status === "completed").length

  // Compute auto-matched learning paths from user's profile
  const interestedAreas = (profileResult.data?.interested_areas as string[] | null) ?? []
  const careerLevel = profileResult.data?.career_level as string | null

  type PathRow = { id: string; title: string; area: string; career_levels: string[] | null }
  const autoMatchedPaths = (allPathsResult.data as PathRow[] ?? []).filter((path) => {
    if (!interestedAreas.includes(path.area)) return false
    const pathLevels = path.career_levels ?? []
    if (pathLevels.length > 0 && careerLevel && !pathLevels.includes(careerLevel)) return false
    return true
  }).map((p) => ({ id: p.id, title: p.title }))

  const pathCertificates = (certsResult.data ?? []) as { career_path_id: string; career_path_title: string; score: number; issued_at: string }[]

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/users" className="text-sm text-gray-500 hover:text-gray-900">← Users</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">User Details</h1>
        <p className="text-sm text-gray-400 font-mono mt-0.5">{id}</p>
      </div>

      <UserDetailClient
        profile={profileResult.data}
        authUser={authUser ? {
          id:              authUser.id,
          email:           authUser.email ?? null,
          created_at:      authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at ?? null,
        } : null}
        userCourses={userCoursesResult.data ?? []}
        calculatedIncompleted={incompleted}
        calculatedCompleted={completed}
        autoMatchedPaths={autoMatchedPaths}
        practiceSubmissions={(practicesResult.data ?? []) as PracticeSubmission[]}
        pathCertificates={pathCertificates}
      />
    </div>
  )
}
