import { createServiceClient } from "@/lib/supabase/server"
import BannersClient from "./BannersClient"

export default async function BannersPage() {
  const supabase = createServiceClient()

  const { data: banners } = await supabase
    .from("banner_slides")
    .select("id, image_url, link_url, display_order, created_at")
    .order("display_order", { ascending: true })

  return <BannersClient banners={banners ?? []} />
}
