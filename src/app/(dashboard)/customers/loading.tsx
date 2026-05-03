export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 w-36 rounded-lg bg-gray-200" />
        <div className="h-9 w-32 rounded-lg bg-gray-200" />
      </div>
      <div className="forge-card overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <div className="h-8 w-56 rounded-lg bg-gray-100" />
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 rounded bg-gray-200" />
                <div className="h-3 w-56 rounded bg-gray-100" />
              </div>
              <div className="h-5 w-16 rounded-full bg-gray-100" />
              <div className="h-3 w-20 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
