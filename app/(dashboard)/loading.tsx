export default function DashboardLoading() {
  const skel = "bg-gray-100 rounded-lg animate-pulse"
  return (
    <div className="p-8 space-y-6">
      <div className={`h-6 w-40 ${skel}`} />
      <div className="grid grid-cols-2 gap-6">
        {[0, 1].map(col => (
          <div key={col} className="flex flex-col gap-6">
            {[0, 1, 2].map(card => (
              <div key={card} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className={`h-4 w-32 ${skel}`} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
                  {[0, 1, 2, 3].map(cell => (
                    <div key={cell} className="px-6 py-4 space-y-2">
                      <div className={`h-3 w-20 ${skel}`} />
                      <div className={`h-7 w-16 ${skel}`} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
