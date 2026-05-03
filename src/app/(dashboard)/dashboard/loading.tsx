export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-5 animate-pulse" style={{ color: 'var(--text-primary)' }}>

      {/* Page header skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-lg bg-gray-200" />
          <div className="h-4 w-72 rounded bg-gray-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-lg bg-gray-100" />
          <div className="h-8 w-28 rounded-lg bg-gray-200" />
        </div>
      </div>

      {/* KPI grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="forge-card p-5 space-y-3">
            <div className="h-3 w-24 rounded bg-gray-100" />
            <div className="h-8 w-16 rounded-lg bg-gray-200" />
            <div className="h-4 w-28 rounded bg-gray-100" />
          </div>
        ))}
      </div>

      {/* Chart + follow-ups skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[14px]">
        <div className="forge-card p-5 lg:col-span-2">
          <div className="h-5 w-36 rounded bg-gray-200 mb-4" />
          <div className="h-[140px] rounded-lg bg-gray-100" />
        </div>
        <div className="forge-card p-5 space-y-3">
          <div className="h-5 w-28 rounded bg-gray-200" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-full rounded bg-gray-100" />
                <div className="h-2.5 w-2/3 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity + leads skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
        {[0, 1].map(col => (
          <div key={col} className="forge-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-36 rounded bg-gray-200" />
              <div className="h-6 w-16 rounded bg-gray-100" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-full rounded bg-gray-100" />
                  <div className="h-2.5 w-1/2 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div className="forge-card p-5">
        <div className="h-5 w-28 rounded bg-gray-200 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-[10px] border space-y-3" style={{ borderColor: 'var(--card-border)' }}>
              <div className="w-9 h-9 rounded-[10px] bg-gray-100" />
              <div className="space-y-1.5">
                <div className="h-3 w-20 rounded bg-gray-100" />
                <div className="h-2.5 w-24 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
