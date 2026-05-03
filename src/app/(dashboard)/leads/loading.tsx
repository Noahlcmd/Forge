export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 w-28 rounded-lg bg-gray-200" />
        <div className="h-9 w-24 rounded-lg bg-gray-200" />
      </div>
      <div className="forge-card overflow-hidden">
        <div className="p-4 border-b flex gap-3" style={{ borderColor: 'var(--card-border)' }}>
          <div className="h-8 w-48 rounded-lg bg-gray-100" />
          <div className="h-8 w-32 rounded-lg bg-gray-100" />
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-44 rounded bg-gray-200" />
                <div className="h-3 w-32 rounded bg-gray-100" />
              </div>
              <div className="h-5 w-20 rounded-full bg-gray-100" />
              <div className="h-3 w-24 rounded bg-gray-100" />
              <div className="h-3 w-16 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
