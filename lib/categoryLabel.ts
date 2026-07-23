const CATEGORY_LABELS: Record<string, string> = {
  "product-design":       "Product Design",
  "digital-marketing":    "Digital Marketing",
  "user-research":        "User Research",
  "branding-design":      "Branding Design",
  "data-and-ai-literacy": "Data & AI Literacy",
}

export function categoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}
