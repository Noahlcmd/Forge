export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-200" />
        <div className="space-y-1.5">
          <div className="h-4 w-40 rounded bg-gray-200" />
          <div className="h-3 w-56 rounded bg-gray-100" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="forge-card p-5 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 rounded bg-gray-100" />
              <div className="h-9 w-full rounded-lg bg-gray-100" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-gray-100" />
            ))}
          </div>
          <div className="h-10 w-full rounded-lg bg-gray-200" />
        </div>
        <div className="forge-card p-5 flex items-center justify-center min-h-64">
          <div className="w-12 h-12 rounded-2xl bg-gray-100" />
        </div>
      </div>
    </div>
  )
}
