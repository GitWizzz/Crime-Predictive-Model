export default function PatrolsLoading() {
  return (
    <div className="mx-auto max-w-[1440px] animate-pulse space-y-5 p-6">
      <div className="space-y-2">
        <div className="h-8 w-36 rounded-xl bg-[var(--bg-subtle)]" />
        <div className="h-4 w-72 rounded-full bg-[var(--bg-subtle)]" />
      </div>

      <div className="surface-card rounded-[22px] p-5 space-y-5">
        <div className="flex justify-between">
          <div className="h-6 w-44 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-8 w-20 rounded-lg bg-[var(--bg-subtle)]" />
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-32 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-10 w-24 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-10 w-24 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-10 w-36 rounded-lg bg-[var(--bg-subtle)]" />
        </div>
      </div>

      <div className="surface-card h-[400px] rounded-[22px]" />

      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="surface-card rounded-[22px] p-5 space-y-4">
            <div className="h-5 w-40 rounded-lg bg-[var(--bg-subtle)]" />
            <div className="overflow-hidden rounded-[14px] border border-[var(--border-default)]">
              <div className="bg-[var(--bg-subtle)] px-4 py-2.5 flex gap-8">
                {Array.from({ length: 3 }).map((__, j) => (
                  <div key={j} className="h-2.5 w-16 rounded-full bg-[var(--bg-muted)]" />
                ))}
              </div>
              {Array.from({ length: 5 }).map((__, j) => (
                <div key={j} className="border-t px-4 py-3 flex gap-8 items-center">
                  <div className="h-4 w-28 rounded bg-[var(--bg-subtle)]" />
                  <div className="h-5 w-16 rounded-full bg-[var(--bg-subtle)]" />
                  <div className="h-5 w-10 rounded-full bg-[var(--bg-subtle)]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
