export default function FirsLoading() {
  return (
    <div className="mx-auto max-w-[1440px] animate-pulse space-y-5 p-6">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-8 w-24 rounded-xl bg-[var(--bg-subtle)]" />
          <div className="h-4 w-56 rounded-full bg-[var(--bg-subtle)]" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 rounded-[14px] bg-[var(--bg-subtle)]" />
          <div className="h-10 w-28 rounded-[14px] bg-[var(--bg-subtle)]" />
        </div>
      </div>

      <div className="surface-card rounded-[22px] overflow-hidden">
        <div className="grid grid-cols-5 gap-4 border-b bg-[var(--bg-subtle)] px-6 py-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-2.5 w-16 rounded-full bg-[var(--bg-muted)]" />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 border-b px-6 py-4 items-center">
            <div className="h-4 w-12 rounded bg-[var(--bg-subtle)]" />
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[var(--bg-subtle)]" />
              <div className="h-4 w-24 rounded bg-[var(--bg-subtle)]" />
            </div>
            <div className="h-4 w-20 rounded bg-[var(--bg-subtle)]" />
            <div className="h-6 w-28 rounded-lg bg-[var(--bg-subtle)]" />
            <div className="h-4 w-16 rounded bg-[var(--bg-subtle)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
