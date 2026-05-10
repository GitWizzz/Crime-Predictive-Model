export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-[1440px] animate-pulse space-y-5 p-6">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 rounded-xl bg-[var(--bg-subtle)]" />
          <div className="h-4 w-64 rounded-full bg-[var(--bg-subtle)]" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-36 rounded-[14px] bg-[var(--bg-subtle)]" />
          <div className="h-10 w-24 rounded-[14px] bg-[var(--bg-subtle)]" />
        </div>
      </div>

      {/* Tab pills */}
      <div className="flex gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-[var(--bg-subtle)]" />
        ))}
      </div>

      {/* Main chart area */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card lg:col-span-2 rounded-[26px] p-5 space-y-4">
          <div className="h-6 w-56 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="flex gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-2.5 w-20 rounded-full bg-[var(--bg-subtle)]" />
                <div className="h-7 w-12 rounded-lg bg-[var(--bg-subtle)]" />
              </div>
            ))}
          </div>
          <div className="h-[260px] rounded-xl bg-[var(--bg-subtle)]" />
        </div>
        <div className="surface-card rounded-[26px] p-5 space-y-4">
          <div className="h-6 w-36 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-4 w-48 rounded-full bg-[var(--bg-subtle)]" />
          <div className="h-20 rounded-[18px] bg-[var(--bg-subtle)]" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[1fr_60px_36px] gap-2 items-center">
              <div className="h-3 rounded-full bg-[var(--bg-subtle)]" />
              <div className="h-1.5 rounded-full bg-[var(--bg-subtle)]" />
              <div className="h-3 rounded bg-[var(--bg-subtle)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
