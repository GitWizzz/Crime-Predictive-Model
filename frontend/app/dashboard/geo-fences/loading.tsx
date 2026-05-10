export default function GeoFencesLoading() {
  return (
    <div className="mx-auto max-w-[1440px] animate-pulse space-y-5 p-6">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 rounded-xl bg-[var(--bg-subtle)]" />
          <div className="h-4 w-72 rounded-full bg-[var(--bg-subtle)]" />
        </div>
        <div className="h-10 w-32 rounded-[14px] bg-[var(--bg-subtle)]" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="surface-card h-[560px] rounded-[22px]" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-card rounded-[22px] p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <div className="h-4 w-36 rounded-lg bg-[var(--bg-subtle)]" />
                  <div className="h-3 w-24 rounded-full bg-[var(--bg-subtle)]" />
                </div>
                <div className="h-6 w-16 rounded-full bg-[var(--bg-subtle)]" />
              </div>
              <div className="h-3 w-full rounded-full bg-[var(--bg-subtle)]" />
              <div className="h-3 w-3/4 rounded-full bg-[var(--bg-subtle)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
