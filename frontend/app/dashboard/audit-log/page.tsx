"use client";

export default function AuditLogPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="surface-card-strong rounded-[30px] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fg-tertiary)]">
          Audit Log
        </p>
        <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
          Administrative activity trail
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--fg-secondary)]">
          This page is added so the admin group matches the Claude dashboard structure. It is
          ready to be expanded with security events, data changes, and traceable user actions.
        </p>
      </section>
    </div>
  );
}
