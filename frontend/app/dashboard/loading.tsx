export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1440px] animate-pulse space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-3 w-40 rounded-full bg-[var(--bg-subtle)]" />
        <div className="h-8 w-72 rounded-xl bg-[var(--bg-subtle)]" />
        <div className="h-4 w-56 rounded-full bg-[var(--bg-subtle)]" />
      </div>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card rounded-[24px] p-5 space-y-4">
            <div className="flex justify-between">
              <div className="h-2.5 w-24 rounded-full bg-[var(--bg-subtle)]" />
              <div className="h-4 w-4 rounded bg-[var(--bg-subtle)]" />
            </div>
            <div className="h-9 w-20 rounded-lg bg-[var(--bg-subtle)]" />
            <div className="h-2.5 w-32 rounded-full bg-[var(--bg-subtle)]" />
            <div className="h-7 w-full rounded-lg bg-[var(--bg-subtle)]" />
          </div>
        ))}
      </div>

      {/* Map placeholder */}
      <div className="surface-card h-[420px] rounded-[28px]" />

      {/* Two-col row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card lg:col-span-2 rounded-[28px] p-5 space-y-4">
          <div className="h-5 w-48 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-4 w-64 rounded-full bg-[var(--bg-subtle)]" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.5fr_1.2fr_1.5fr_1fr] gap-4 py-2">
                {Array.from({ length: 5 }).map((__, j) => (
                  <div key={j} className="h-4 rounded-full bg-[var(--bg-subtle)]" />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="surface-card rounded-[28px] p-5 space-y-4">
          <div className="h-5 w-36 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-4 w-48 rounded-full bg-[var(--bg-subtle)]" />
          <div className="mt-4 h-24 rounded-xl bg-[var(--bg-subtle)]" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-14 rounded-xl bg-[var(--bg-subtle)]" />
            <div className="h-14 rounded-xl bg-[var(--bg-subtle)]" />
          </div>
        </div>
      </div>

      {/* Bottom 3-col */}
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="surface-card rounded-[28px] p-5 space-y-4">
            <div className="h-5 w-32 rounded-lg bg-[var(--bg-subtle)]" />
            <div className="h-4 w-48 rounded-full bg-[var(--bg-subtle)]" />
            {Array.from({ length: 5 }).map((__, j) => (
              <div key={j} className="grid grid-cols-[1fr_80px_32px] gap-3 items-center">
                <div className="h-3 rounded-full bg-[var(--bg-subtle)]" />
                <div className="h-2 rounded-full bg-[var(--bg-subtle)]" />
                <div className="h-3 w-6 rounded bg-[var(--bg-subtle)]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
