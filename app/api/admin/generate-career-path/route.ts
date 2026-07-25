import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

const AREA_TO_JOB: Record<string, string> = {
  "product-design":        "Product Designer",
  "design-and-branding":   "Brand Designer",
  "ai-tools":              "AI-Ready Professional",
  "digital-marketing-tech":"Digital Marketer",
  "data-decision-making":  "Data Analyst",
  "user-research":         "UX Researcher",
}

const LEVEL_LABEL: Record<string, string> = {
  junior: "Junior",
  middle: "Mid-Level",
  senior: "Senior",
  lead:   "Lead",
}

const LEVEL_TO_COURSE_LEVELS: Record<string, string[]> = {
  junior: ["basic"],
  middle: ["basic", "intermediate"],
  senior: ["intermediate", "advanced"],
  lead:   ["advanced"],
}

export async function POST(req: NextRequest) {
  try {
    const { area, careerLevel } = await req.json()

    if (!area || !careerLevel) {
      return NextResponse.json({ error: "area and careerLevel are required" }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: courses } = await supabase
      .from("courses")
      .select("id, course_name, category, level")
      .eq("is_published", true)
      .order("display_order", { ascending: true })

    const jobTitle      = AREA_TO_JOB[area]   ?? area
    const levelLabel    = LEVEL_LABEL[careerLevel] ?? careerLevel
    const defaultTitle  = `${levelLabel} ${jobTitle}`
    const suggestedLevels = LEVEL_TO_COURSE_LEVELS[careerLevel] ?? ["basic"]

    const courseList = (courses ?? [])
      .map((c: { id: string; course_name: string; category: string; level: string }) =>
        `ID:"${c.id}" | Name:"${c.course_name}" | Category:${c.category} | Level:${c.level}`)
      .join("\n")

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const prompt = `You are a curriculum designer for Mishka, a professional online learning platform covering UX/product design, branding, digital marketing, user research, and data literacy.

Generate a complete learning path for a ${levelLabel} ${jobTitle}.

Available courses (ONLY use IDs from this list):
${courseList}

Return ONLY valid JSON with this exact structure — no explanation, no markdown:
{
  "title": "${defaultTitle}",
  "categories": [],
  "levels": [],
  "course_ids": [],
  "tasks": [
    {"headline": "...", "brief": "...", "link_type": "figma"},
    {"headline": "...", "brief": "...", "link_type": "google_drive"},
    {"headline": "...", "brief": "...", "link_type": "figma"},
    {"headline": "...", "brief": "...", "link_type": "figjam"},
    {"headline": "...", "brief": "...", "link_type": "google_drive"}
  ]
}

Rules:
- title: must be exactly "${defaultTitle}"
- categories: pick from ["product-design","digital-marketing","branding-design","user-research","data-and-ai-literacy"]
- levels: use ${JSON.stringify(suggestedLevels)} for a ${levelLabel}
- course_ids: 6–10 most relevant courses in logical learning order; IDs must exist in the list above
- tasks: exactly 5 unique real-world practice tasks for a ${levelLabel} ${jobTitle}
  - link_type "figma" or "figjam" for design/visual tasks; "google_drive" for strategy, research, or documentation tasks
  - brief: 2–3 sentences — what to do, what to deliver, constraints`

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
    })

    const raw = response.choices[0]?.message?.content ?? "{}"
    const generated = JSON.parse(raw)

    return NextResponse.json({
      title:      generated.title      ?? defaultTitle,
      categories: generated.categories ?? [],
      levels:     generated.levels     ?? suggestedLevels,
      course_ids: generated.course_ids ?? [],
      tasks:      Array.isArray(generated.tasks) ? generated.tasks.slice(0, 5) : [],
    })
  } catch (err) {
    console.error("[generate-career-path]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
