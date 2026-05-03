export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="h-6 w-40 rounded-lg bg-gray-200" />
      <div className="h-10 w-full max-w-sm rounded-lg bg-gray-200" />
      <div className="forge-card overflow-hidden">
        <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="w-9 h-9 rounded-lg bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 rounded bg-gray-200" />
                <div className="h-3 w-60 rounded bg-gray-100" />
              </div>
              <div className="h-5 w-14 rounded-full bg-gray-100" />
              <div className="h-8 w-20 rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
