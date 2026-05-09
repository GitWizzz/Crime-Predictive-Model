"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import { useMemo, useState } from "react";

type UserRow = {
  name: string;
  email: string;
  role: "OFFICER" | "ANALYST" | "ADMIN";
  station: string;
  lastLogin: string;
  online: boolean;
};

const seedUsers: UserRow[] = [
  {
    name: "A. Choudhary",
    email: "a.choudhary@bihar.police.in",
    role: "OFFICER",
    station: "Bhagalpur",
    lastLogin: "12 min ago",
    online: true,
  },
  {
    name: "M. Verma",
    email: "m.verma@bihar.police.in",
    role: "OFFICER",
    station: "Gaya Town",
    lastLogin: "1 hr ago",
    online: false,
  },
  {
    name: "R. Kumar",
    email: "r.kumar@bihar.police.in",
    role: "ANALYST",
    station: "HQ Patna",
    lastLogin: "8 min ago",
    online: true,
  },
  {
    name: "K. Devi",
    email: "k.devi@bihar.police.in",
    role: "OFFICER",
    station: "Muzaffarpur",
    lastLogin: "3 hr ago",
    online: false,
  },
  {
    name: "S. Banerjee",
    email: "s.banerjee@bihar.police.in",
    role: "ADMIN",
    station: "HQ Patna",
    lastLogin: "25 min ago",
    online: true,
  },
];

const roleTone = (role: UserRow["role"]) =>
  role === "ADMIN"
    ? "bg-[var(--risk-high-bg)] text-[var(--risk-high)]"
    : role === "ANALYST"
      ? "bg-[var(--accent-50)] text-[var(--accent-700)]"
      : "bg-[var(--bg-subtle)] text-[var(--fg-secondary)]";

export default function UsersPage() {
  const [currentUser] = useState<UserRow | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = window.localStorage.getItem("authUser");
      if (!stored) return null;
      const user = JSON.parse(stored) as { name?: string; email?: string; role?: UserRow["role"] };
      return {
        name: user.name || "P. Singh",
        email: user.email || "p.singh@bihar.police.in",
        role: (user.role as UserRow["role"]) || "OFFICER",
        station: "Patna Central",
        lastLogin: "2 min ago",
        online: true,
      };
    } catch {
      return null;
    }
  });

  const users = useMemo(
    () => (currentUser ? [currentUser, ...seedUsers] : seedUsers),
    [currentUser]
  );

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
            Users
          </h1>
          <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
            {users.length} active officers across 14 stations
          </p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-[var(--accent-500)] px-4 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />
          Invite user
        </button>
      </div>

      <section className="surface-card overflow-hidden rounded-[24px] p-0">
        <div className="grid grid-cols-[2fr_1.4fr_100px_1.2fr_120px_80px] border-b bg-[var(--bg-subtle)]/60 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Station</span>
          <span>Last login</span>
          <span />
        </div>
        {users.map((user) => (
          <div
            key={user.email}
            className="grid grid-cols-[2fr_1.4fr_100px_1.2fr_120px_80px] items-center border-b px-5 py-3 text-[13px] last:border-0 hover:bg-[var(--bg-subtle)]/40"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="relative">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--accent-50)] text-[11px] font-semibold text-[var(--accent-700)]">
                    {user.name[0]}
                  </span>
                  {user.online ? (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-surface)] bg-[var(--risk-low)]" />
                  ) : null}
                </span>
                <span className="truncate font-medium text-[var(--fg-primary)]">{user.name}</span>
              </div>
            </div>
            <span className="truncate font-mono text-[11.5px] text-[var(--fg-secondary)]">
              {user.email}
            </span>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleTone(user.role)}`}>
              {user.role}
            </span>
            <span className="text-[var(--fg-secondary)]">{user.station}</span>
            <span className="tabular-nums text-[var(--fg-tertiary)]">{user.lastLogin}</span>
            <span className="text-right text-[var(--fg-tertiary)]">
              <MoreHorizontal className="h-4 w-4" />
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
