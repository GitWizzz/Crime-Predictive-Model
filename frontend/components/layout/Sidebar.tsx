"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bell,
  Car,
  ChartColumn,
  FileText,
  Home,
  Map,
  Search,
  RadioTower,
  Settings,
  ShieldAlert,
  TrafficCone,
  Users,
  Waypoints,
  ScrollText,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: React.ElementType; roles?: string[] };
type NavGroup = { title: string; items: NavItem[]; roles?: string[] };

const navGroups: NavGroup[] = [
  {
    title: "Operational",
    items: [
      { label: "Dashboard",    href: "/dashboard",              icon: Home        },
      { label: "Hotspots",     href: "/dashboard/hotspots",     icon: Map         },
      { label: "FIRs",         href: "/dashboard/firs",         icon: FileText    },
    ],
  },
  {
    title: "Analytical",
    items: [
      { label: "Analytics",    href: "/dashboard/analytics",    icon: ChartColumn },
      { label: "Patrol",       href: "/dashboard/patrols",      icon: Car         },
    ],
  },
  {
    title: "Specialised",
    items: [
      { label: "Road Safety",  href: "/dashboard/irad",         icon: TrafficCone },
      { label: "Women Safety", href: "/dashboard/women-safety", icon: ShieldAlert },
      { label: "Geo-Fences",  href: "/dashboard/geo-fences",   icon: Waypoints   },
      { label: "Reports",      href: "/dashboard/reports",      icon: ScrollText  },
    ],
  },
  {
    title: "Admin",
    roles: ["ADMIN"],
    items: [
      { label: "Users",        href: "/dashboard/users",        icon: Users,      roles: ["ADMIN"] },
      { label: "Audit Log",    href: "/dashboard/audit-log",    icon: RadioTower, roles: ["ADMIN"] },
      { label: "Settings",     href: "/dashboard/settings",     icon: Settings,   roles: ["ADMIN"] },
    ],
  },
];

type AuthUser = {
  name?: string;
  role?: string;
  zone?: string;
  police_station?: string;
  policeStation?: string;
};

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hideChrome = pathname === "/dashboard/firs" && searchParams.get("compose") === "1";

  const [user] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("authUser");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  if (hideChrome) return null;

  const displayName = user?.name || "Officer";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const station = user?.police_station || user?.policeStation || user?.zone || "Bihar Police";
  const roleLabel = user?.role
    ? user.role.charAt(0) + user.role.slice(1).toLowerCase()
    : "Officer";

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-[var(--border-default)] bg-[var(--bg-surface)] lg:flex dark:border-[var(--border-default)] dark:bg-[var(--bg-surface)]">
      {/* Logo / brand */}
      <div className="border-b border-[var(--border-default)] px-5 py-4">

        {/* Search */}
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--fg-tertiary)] hover:border-[var(--border-strong)] hover:text-[var(--fg-secondary)] cursor-pointer">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-[13px]">Search…</span>
          <span className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] font-semibold">⌘K</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {navGroups
          .filter(group => !group.roles || group.roles.includes(user?.role || ""))
          .map((group) => (
          <div key={group.title} className="mb-4">
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items
                .filter(item => !item.roles || item.roles.includes(user?.role || ""))
                .map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-[var(--accent-50)] text-[var(--accent-600)] shadow-[inset_0_0_0_1px_var(--accent-100)] dark:bg-[var(--accent-50)] dark:text-[var(--accent-500)]"
                        : "text-[var(--fg-secondary)] hover:bg-(--accent-50) hover:text-(--accent-600) hover:translate-x-1 hover:shadow-[inset_0_0_0_1px_var(--accent-100)]"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-all duration-150 ${
                        isActive
                          ? "text-[var(--accent-500)]"
                          : "text-[var(--fg-tertiary)] group-hover:text-[var(--accent-500)] group-hover:scale-110"
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-500)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="border-t border-[var(--border-default)] px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-[var(--bg-subtle)] px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-100)] text-[12px] font-bold text-[var(--accent-700)]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[var(--fg-primary)]">{displayName}</p>
            <p className="truncate text-[11px] text-[var(--fg-tertiary)]">{roleLabel} · {station}</p>
          </div>
          <button className="rounded-md p-1 text-[var(--fg-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--fg-primary)]">
            <Bell className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
