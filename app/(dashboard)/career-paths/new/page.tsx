import { createServiceClient } from "@/lib/supabase/server"
import Link from "next/link"
import CareerPathForm from "../CareerPathForm"

export const dynamic = "force-dynamic"

export default async function NewCareerPathPage() {
  const supabase = createServiceClient()
  const { data: courses } = await supabase
    .from("courses")
    .select("id, course_name, level, category, is_published")
    .order("display_order", { ascending: true })

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/career-paths" className="text-sm text-gray-500 hover:text-gray-900">
          ← Learning Paths
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">New Learning Path</h1>
      </div>

      <CareerPathForm courses={courses ?? []} />
    </div>
  )
}
