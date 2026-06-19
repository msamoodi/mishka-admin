import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import UserDetailClient from "./UserDetailClient"

export const dynamic = "force-dynamic"

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [profileResult, authResult, userCoursesResult, allPathsResult, assignedPathsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.auth.admin.getUserById(id),
    supabase
      .from("user_courses")
      .select("course_id, status, progress_percent, last_accessed_at, completed_at, courses(id, course_name, slug, thumbnail_url)")
      .eq("user_id", id)
      .order("last_accessed_at", { ascending: false }),
    supabase.from("career_paths").select("id, title").eq("is_published", true).order("created_at", { ascending: true }),
    supabase.from("user_career_paths").select("career_path_id").eq("user_id", id),
  ])

  if (!profileResult.data) notFound()

  const authUser = authResult.data?.user ?? null
  const incompleted = (userCoursesResult.data ?? []).filter((c: { status: string }) => c.status !== "completed").length
  const completed   = (userCoursesResult.data ?? []).filter((c: { status: string }) => c.status === "completed").length
  const assignedIds = (assignedPathsResult.data ?? []).map((r: { career_path_id: string }) => r.career_path_id)

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-900">← Users</Link>
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
        allCareerPaths={allPathsResult.data ?? []}
        assignedCareerPathIds={assignedIds}
      />
    </div>
  )
}
