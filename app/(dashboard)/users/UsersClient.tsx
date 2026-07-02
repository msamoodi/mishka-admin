"use client"
import { withBasePath, resolveAppUrl } from "@/lib/basePath"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SortableTh } from "@/components/SortableTh"

type User = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar_url: string | null
  rank: string | null
  completed_courses_count: number | null
  last_sign_in_at: string | null
  last_seen_at: string | null
}

const RANK_COLOR: Record<string, string> = {
  starter:  "bg-gray-100 text-gray-600",
  bronze:   "bg-amber-50 text-amber-700",
  silver:   "bg-slate-50 text-slate-600",
  gold:     "bg-yellow-50 text-yellow-700",
  platinum: "bg-cyan-50 text-cyan-700",
  diamond:  "bg-blue-50 text-blue-700",
  sapphire: "bg-indigo-50 text-indigo-700",
  emerald:  "bg-green-50 text-green-700",
  ruby:     "bg-red-50 text-red-700",
  legend:   "bg-purple-50 text-purple-700",
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolveAppUrl(url)}
        alt={name}
        className="w-9 h-9 rounded-full object-cover bg-gray-100"
        onError={e => {
          const el = e.target as HTMLImageElement
          el.style.display = "none"
          el.nextElementSibling?.classList.remove("hidden")
        }}
      />
    )
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-500">
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  )
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

type UserSortCol = "rank" | "email" | "last_sign_in_at" | "last_seen_at"

export default function UsersClient({ users }: { users: User[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [sortCol, setSortCol] = useState<UserSortCol | "">("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const onSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortCol(col as UserSortCol); setSortDir("asc"); setPage(1) }
  }

  const filtered = query.trim()
    ? users.filter(u => u.email?.toLowerCase().includes(query.toLowerCase()))
    : users

  const sorted = sortCol ? [...filtered].sort((a, b) => {
    const av = (a[sortCol] ?? "").toString().toLowerCase()
    const bv = (b[sortCol] ?? "").toString().toLowerCase()
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
  }) : filtered

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const allSelected = paginated.length > 0 && paginated.every(u => selected.has(u.id))
  const someSelected = paginated.some(u => selected.has(u.id))
  const selectedCount = [...selected].filter(id => filtered.some(u => u.id === id)).length

  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        paginated.forEach(u => next.delete(u.id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        paginated.forEach(u => next.add(u.id))
        return next
      })
    }
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleDelete = () => {
    const ids = [...selected].filter(id => filtered.some(u => u.id === id))
    startTransition(async () => {
      const res = await fetch(withBasePath("/api/admin/delete-users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: ids }),
      })
      if (res.ok) {
        setSelected(new Set())
        setConfirmDelete(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length}{query ? ` of ${users.length}` : ""} users
          </p>
        </div>
      </div>

      {/* Search + bulk actions row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-full max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by email…"
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1) }}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{selectedCount} selected</span>
            {confirmDelete ? (
              <>
                <span className="text-sm text-red-600 font-medium">Delete {selectedCount} user{selectedCount > 1 ? "s" : ""}?</span>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="h-9 px-4 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="h-9 px-4 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="h-9 px-4 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
              >
                Delete selected
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {/* Select all checkbox */}
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer"
                />
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">User ID</th>
              <SortableTh col="rank"            label="Rank"       sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <th className="text-left px-4 py-3 font-medium text-gray-500">Avatar</th>
              <SortableTh col="email"           label="Email"      sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="last_sign_in_at" label="Last Login" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="last_seen_at"    label="Last Visit" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  {query ? `No users matching "${query}"` : "No users yet"}
                </td>
              </tr>
            )}
            {paginated.map(u => {
              const displayName = [u.first_name, u.last_name].filter(Boolean).join(" ") || "—"
              const isSelected = selected.has(u.id)
              return (
                <tr
                  key={u.id}
                  className={`hover:bg-gray-50 transition-colors ${isSelected ? "bg-blue-50/60" : ""}`}
                >
                  {/* Row checkbox */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(u.id)}
                      className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer"
                    />
                  </td>

                  {/* ID */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-400">{u.id.slice(0, 8)}…</span>
                  </td>

                  {/* Rank */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${RANK_COLOR[u.rank ?? ""] ?? "bg-gray-100 text-gray-500"}`}>
                      {u.rank ?? "—"}
                    </span>
                  </td>

                  {/* Avatar */}
                  <td className="px-4 py-3">
                    <div className="relative inline-block">
                      <Avatar url={u.avatar_url} name={displayName} />
                      {!u.avatar_url && (
                        <div className="hidden w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-500">
                          {displayName[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Email + name */}
                  <td className="px-4 py-3">
                    <p className="text-gray-900">{u.email ?? "—"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{displayName}</p>
                  </td>

                  {/* Last Login */}
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {fmt(u.last_sign_in_at)}
                  </td>

                  {/* Last Visit */}
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {fmt(u.last_seen_at)}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/users/${u.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="h-8 px-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          >
            {[20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-2">
            {filtered.length === 0 ? "0" : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)}`} of {filtered.length}
          </span>
          <button
            onClick={() => setPage(1)}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default transition-colors"
            aria-label="First page"
          >«</button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default transition-colors"
            aria-label="Previous page"
          >‹</button>
          <span className="px-2 font-medium text-gray-700">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default transition-colors"
            aria-label="Next page"
          >›</button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={currentPage === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default transition-colors"
            aria-label="Last page"
          >»</button>
        </div>
      </div>
    </div>
  )
}
