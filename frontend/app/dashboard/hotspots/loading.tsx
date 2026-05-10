export default function HotspotsLoading() {
  return (
    <div className="mx-auto max-w-[1440px] animate-pulse space-y-5 p-6">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 rounded-xl bg-[var(--bg-subtle)]" />
          <div className="h-4 w-64 rounded-full bg-[var(--bg-subtle)]" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 rounded-[14px] bg-[var(--bg-subtle)]" />
          <div className="h-10 w-28 rounded-[14px] bg-[var(--bg-subtle)]" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="surface-card h-[580px] rounded-[22px]" />
        <div className="space-y-4">
          <div className="surface-card rounded-[22px] p-5 space-y-3">
            <div className="h-5 w-28 rounded-lg bg-[var(--bg-subtle)]" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-[var(--bg-subtle)]" />
            ))}
          </div>
          <div className="surface-card rounded-[22px] p-5 space-y-3">
            <div className="h-5 w-36 rounded-lg bg-[var(--bg-subtle)]" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_36px] gap-2 items-center">
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
