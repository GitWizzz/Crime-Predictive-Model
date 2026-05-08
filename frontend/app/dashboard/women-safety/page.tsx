"use client";

export default function WomenSafetyPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="surface-card-strong rounded-[30px] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fg-tertiary)]">
          Women Safety
        </p>
        <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
          Safety intelligence layer
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--fg-secondary)]">
          This section is now added to match the Claude dashboard structure. It can be expanded
          next with women-safety hotspots, FIR classification, and patrol prioritisation.
        </p>
      </section>
    </div>
  );
}
