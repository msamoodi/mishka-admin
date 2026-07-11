export default function TicketsLoading() {
  const skel = "bg-gray-100 rounded animate-pulse"
  return (
    <div className="p-8">
      <div className={`h-6 w-36 ${skel} mb-6`} />
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className={`h-9 w-48 ${skel}`} />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full ${skel} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 space-y-2">
                <div className={`h-4 w-48 ${skel}`} />
                <div className={`h-3 w-full max-w-sm ${skel}`} />
              </div>
              <div className={`h-5 w-16 rounded-full ${skel}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
