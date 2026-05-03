export default function WorkspaceLoading() {
  return (
    <div className="p-6 space-y-5">
      <div className="space-y-1.5">
        <div className="h-6 w-32 rounded-lg bg-zinc-800 animate-pulse" />
        <div className="h-4 w-72 rounded bg-zinc-800/60 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 animate-pulse">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800" />
              <div className="h-7 w-16 rounded-lg bg-zinc-800" />
            </div>
            <div className="h-4 w-24 rounded bg-zinc-800 mb-2" />
            <div className="h-3 w-40 rounded bg-zinc-800/60" />
          </div>
        ))}
      </div>
    </div>
  )
}
