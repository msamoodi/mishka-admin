export default function UsersLoading() {
  const skel = "bg-gray-100 rounded animate-pulse"
  return (
    <div className="p-8">
      <div className={`h-6 w-32 ${skel} mb-6`} />
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex gap-3">
          <div className={`h-9 w-64 ${skel}`} />
          <div className={`h-9 w-28 ${skel}`} />
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["User", "Rank", "Courses", "Last Active", ""].map(h => (
                <th key={h} className="text-left px-5 py-3">
                  <div className={`h-3 w-16 ${skel}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${skel}`} />
                    <div className="space-y-1.5">
                      <div className={`h-3 w-28 ${skel}`} />
                      <div className={`h-3 w-36 ${skel}`} />
                    </div>
                  </div>
                </td>
                {[0, 1, 2, 3].map(c => (
                  <td key={c} className="px-5 py-3"><div className={`h-3 w-12 ${skel}`} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
