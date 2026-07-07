import { createServiceClient } from "@/lib/supabase/server"
import Link from "next/link"
import DeleteCareerPathButton from "./DeleteCareerPathButton"
import { AREAS, CATEGORIES, LEVELS, CAREER_LEVELS } from "./constants"

export const revalidate = 300

const LEVEL_COLOR: Record<string, string> = {
  basic:        "bg-blue-50 text-blue-700",
  intermediate: "bg-purple-50 text-purple-700",
  advanced:     "bg-orange-50 text-orange-700",
}

const CAREER_LEVEL_COLOR: Record<string, string> = {
  junior: "bg-sky-50 text-sky-700",
  middle: "bg-violet-50 text-violet-700",
  senior: "bg-amber-50 text-amber-700",
  lead:   "bg-rose-50 text-rose-700",
}

function areaLabel(value: string) {
  return AREAS.find(a => a.value === value)?.label ?? value
}

function categoryLabel(value: string) {
  return CATEGORIES.find(c => c.value === value)?.label ?? value
}

function levelLabel(value: string) {
  return LEVELS.find(l => l.value === value)?.label ?? value
}

type CareerPathRow = {
  id: string
  title: string
  area: string
  categories: string[]
  levels: string[]
  career_levels: string[]
  course_ids: string[]
  is_published: boolean
  created_at: string
}

export default async function CareerPathsPage() {
  const supabase = createServiceClient()
  const { data: paths } = await supabase
    .from("career_paths")
    .select("id, title, area, categories, levels, career_levels, course_ids, is_published, created_at")
    .order("created_at", { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Career Paths</h1>
          <p className="text-sm text-gray-500 mt-0.5">{paths?.length ?? 0} total</p>
        </div>
        <Link
          href="/career-paths/new"
          className="h-9 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          + New Path
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Area</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">For</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Levels</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Courses</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(!paths || paths.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  No career paths yet. Create your first one.
                </td>
              </tr>
            )}
            {(paths as CareerPathRow[] | null)?.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">

                {/* Title */}
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{p.title}</p>
                </td>

                {/* Area */}
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {p.area ? areaLabel(p.area) : <span className="text-gray-300">—</span>}
                </td>

                {/* Categories */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {((p.categories ?? []) as string[]).length === 0
                      ? <span className="text-gray-300 text-xs">—</span>
                      : ((p.categories ?? []) as string[]).map(c => (
                          <span key={c} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {categoryLabel(c)}
                          </span>
                        ))
                    }
                  </div>
                </td>

                {/* Career levels */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {((p.career_levels ?? []) as string[]).length === 0
                      ? <span className="text-gray-300 text-xs">—</span>
                      : ((p.career_levels ?? []) as string[]).map(l => (
                          <span key={l} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CAREER_LEVEL_COLOR[l] ?? "bg-gray-100 text-gray-500"}`}>
                            {CAREER_LEVELS.find(c => c.value === l)?.label ?? l}
                          </span>
                        ))
                    }
                  </div>
                </td>

                {/* Course difficulty levels */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(p.levels as string[]).length === 0
                      ? <span className="text-gray-300 text-xs">—</span>
                      : (p.levels as string[]).map(l => (
                          <span key={l} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLOR[l] ?? "bg-gray-100 text-gray-500"}`}>
                            {levelLabel(l)}
                          </span>
                        ))
                    }
                  </div>
                </td>

                {/* Courses count */}
                <td className="px-4 py-3 text-gray-600">
                  {(p.course_ids as string[]).length}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.is_published ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {p.is_published ? "Published" : "Draft"}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <Link
                      href={`/career-paths/${p.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Edit
                    </Link>
                    <DeleteCareerPathButton id={p.id} title={p.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
