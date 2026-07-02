type Props = {
  col: string
  label: string
  sortCol: string
  sortDir: "asc" | "desc"
  onSort: (col: string) => void
  className?: string
}

export function SortableTh({ col, label, sortCol, sortDir, onSort, className = "" }: Props) {
  const active = sortCol === col
  return (
    <th
      onClick={() => onSort(col)}
      className={`text-left px-4 py-3 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-900 transition-colors ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] ${active ? "text-gray-900" : "text-gray-300"}`}>
          {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </span>
    </th>
  )
}
