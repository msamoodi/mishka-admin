import { createServiceClient } from "@/lib/supabase/server"
import CategoriesClient from "./CategoriesClient"

export const revalidate = 300

export default async function CategoriesPage() {
  const supabase = createServiceClient()

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, description, color, display_order")
    .order("display_order", { ascending: true })

  return <CategoriesClient categories={categories ?? []} />
}
