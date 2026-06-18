import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import CareerPathForm from "../CareerPathForm"

export const dynamic = "force-dynamic"

export default async function EditCareerPathPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  const [pathResult, coursesResult] = await Promise.all([
    supabase
      .from("career_paths")
      .select("id, title, area, category, levels, course_ids, is_published")
      .eq("id", id)
      .single(),
    supabase
      .from("courses")
      .select("id, course_name, level, category, is_published")
      .order("display_order", { ascending: true }),
  ])

  if (!pathResult.data) notFound()

  const path = pathResult.data

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/career-paths" className="text-sm text-gray-500 hover:text-gray-900">
          ← Career Paths
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">{path.title}</h1>
        <p className="text-sm text-gray-400 font-mono mt-0.5">{id}</p>
      </div>

      <CareerPathForm
        initial={{
          id:           path.id,
          title:        path.title,
          area:         path.area ?? "",
          category:     path.category ?? "",
          levels:       (path.levels as string[]) ?? [],
          course_ids:   (path.course_ids as string[]) ?? [],
          is_published: path.is_published ?? false,
        }}
        courses={coursesResult.data ?? []}
      />
    </div>
  )
}
