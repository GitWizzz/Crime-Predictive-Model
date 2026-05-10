export default function WomenSafetyLoading() {
  return (
    <div className="mx-auto max-w-[1440px] animate-pulse space-y-5 p-6">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-8 w-44 rounded-xl bg-[var(--bg-subtle)]" />
          <div className="h-4 w-80 rounded-full bg-[var(--bg-subtle)]" />
        </div>
        <div className="h-10 w-32 rounded-[14px] bg-[var(--bg-subtle)]" />
      </div>

      <div className="h-12 rounded-[18px] bg-[var(--bg-subtle)]" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card rounded-[18px] p-4 space-y-3">
            <div className="h-2.5 w-20 rounded-full bg-[var(--bg-subtle)]" />
            <div className="h-8 w-14 rounded-lg bg-[var(--bg-subtle)]" />
            <div className="h-2.5 w-16 rounded-full bg-[var(--bg-subtle)]" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="surface-card h-[540px] rounded-[22px]" />
        <div className="space-y-4">
          <div className="surface-card rounded-[22px] p-5 space-y-4">
            <div className="h-5 w-36 rounded-lg bg-[var(--bg-subtle)]" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <div className="h-3 w-24 rounded-full bg-[var(--bg-subtle)]" />
                  <div className="h-3 w-6 rounded bg-[var(--bg-subtle)]" />
                </div>
                <div className="h-1.5 rounded-full bg-[var(--bg-subtle)]" />
              </div>
            ))}
          </div>
          <div className="surface-card rounded-[22px] p-5 space-y-3">
            <div className="h-5 w-28 rounded-lg bg-[var(--bg-subtle)]" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_32px] gap-2 items-center">
                <div className="h-3 rounded-full bg-[var(--bg-subtle)]" />
                <div className="h-1.5 rounded-full bg-[var(--bg-subtle)]" />
                <div className="h-3 rounded bg-[var(--bg-subtle)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
