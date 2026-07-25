import { createServiceClient } from "@/lib/supabase/server"
import ModalsClient from "./ModalsClient"

export default async function ModalsPage() {
  const supabase = createServiceClient()
  const { data: modals } = await supabase
    .from("app_modals")
    .select("*")
    .order("created_at", { ascending: false })

  return <ModalsClient modals={modals ?? []} />
}
