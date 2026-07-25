import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    id,
    headline, headline_size, headline_color,
    sub_headline, sub_headline_size, sub_headline_color,
    description, description_size, description_color,
    cta_label, cta_url,
    background_image_url,
    show_rule, rule_value,
    expires_at,
  } = body

  if (!headline?.trim()) return NextResponse.json({ error: "Headline is required" }, { status: 400 })
  if (!show_rule) return NextResponse.json({ error: "Show rule is required" }, { status: 400 })

  const supabase = createServiceClient()
  const payload = {
    headline: headline.trim(),
    headline_size: Number(headline_size) || 38,
    headline_color: headline_color || "#ffffff",
    sub_headline: sub_headline?.trim() ?? "",
    sub_headline_size: Number(sub_headline_size) || 18,
    sub_headline_color: sub_headline_color || "#ffffff",
    description: description?.trim() ?? "",
    description_size: Number(description_size) || 14,
    description_color: description_color || "#ffffff",
    cta_label: cta_label?.trim() || "Start Exploring",
    cta_url: cta_url?.trim() || null,
    background_image_url: background_image_url?.trim() || null,
    show_rule,
    rule_value: rule_value ? Number(rule_value) : null,
    expires_at: expires_at || null,
    updated_at: new Date().toISOString(),
  }

  if (id) {
    const { data, error } = await supabase
      .from("app_modals")
      .update(payload)
      .eq("id", id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, modal: data })
  } else {
    const { data, error } = await supabase
      .from("app_modals")
      .insert({ ...payload, is_active: false })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, modal: data })
  }
}
