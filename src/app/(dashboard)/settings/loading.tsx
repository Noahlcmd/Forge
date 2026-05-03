export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="h-6 w-24 rounded-lg bg-gray-200" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-lg bg-gray-200" />
        ))}
      </div>
      <div className="forge-card p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-28 rounded bg-gray-100" />
            <div className="h-9 w-full rounded-lg bg-gray-100" />
          </div>
        ))}
        <div className="h-9 w-32 rounded-lg bg-gray-200 mt-2" />
      </div>
    </div>
  )
}
