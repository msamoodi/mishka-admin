import { createServiceClient } from "@/lib/supabase/server"
import CoursesClient from "./CoursesClient"

export const dynamic = "force-dynamic"

export default async function CoursesPage() {
  const supabase = createServiceClient()
  const { data: rawCourses } = await supabase
    .from("courses")
    .select("id, slug, course_name, category, level, is_published, display_order, course_type, lessons(count), quiz_questions(count)")
    .order("display_order", { ascending: true })

  const courses = (rawCourses ?? []).map((c: any) => ({
    id:            c.id,
    slug:          c.slug,
    course_name:   c.course_name,
    category:      c.category,
    level:         c.level,
    is_published:  c.is_published,
    display_order: c.display_order,
    course_type:   c.course_type ?? "standard",
    lesson_count:  (c.lessons as unknown as { count: number }[])?.[0]?.count ?? 0,
    quiz_count:    (c.quiz_questions as unknown as { count: number }[])?.[0]?.count ?? 0,
  }))

  return <CoursesClient courses={courses} />
}
