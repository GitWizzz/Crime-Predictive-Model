"use client";

export default function UsersPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="surface-card-strong rounded-[30px] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fg-tertiary)]">
          Users
        </p>
        <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
          User administration
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--fg-secondary)]">
          Admin-level user management is now represented in the dashboard navigation to match
          the Claude layout. Role-based user controls can be implemented here next.
        </p>
      </section>
    </div>
  );
}
