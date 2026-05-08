"use client";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="surface-card-strong rounded-[30px] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fg-tertiary)]">
          Settings
        </p>
        <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
          Dashboard preferences
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--fg-secondary)]">
          Theme control is already available in the top bar. This section can be extended next
          for language, notification, and profile preferences.
        </p>
      </section>
    </div>
  );
}
