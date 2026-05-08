"use client";

export default function GeoFencesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="surface-card-strong rounded-[30px] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fg-tertiary)]">
          Geo-Fences
        </p>
        <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
          Boundary monitoring workspace
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--fg-secondary)]">
          This placeholder page keeps the dashboard navigation aligned with the Claude design.
          We can build polygon drawing, alert triggers, and zone-based notifications here next.
        </p>
      </section>
    </div>
  );
}
