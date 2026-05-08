"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Car,
  ChartColumn,
  FileText,
  Home,
  Map,
  RadioTower,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  TrafficCone,
  Users,
  Waypoints,
  ScrollText,
} from "lucide-react";

const navGroups = [
  {
    title: "Operational",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: Home },
      { label: "Hotspots", href: "/dashboard/hotspots", icon: Map },
      { label: "FIRs", href: "/dashboard/firs", icon: FileText, badge: "14" },
    ],
  },
  {
    title: "Analytical",
    items: [
      { label: "Analytics", href: "/dashboard/analytics", icon: ChartColumn },
      { label: "Patrol", href: "/dashboard/patrols", icon: Car },
    ],
  },
  {
    title: "Specialised",
    items: [
      { label: "Road Safety", href: "/dashboard/irad", icon: TrafficCone },
      { label: "Women Safety", href: "/dashboard/women-safety", icon: ShieldAlert },
      { label: "Geo-Fences", href: "/dashboard/geo-fences", icon: Waypoints },
      { label: "Reports", href: "/dashboard/reports", icon: ScrollText },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Users", href: "/dashboard/users", icon: Users },
      { label: "Audit Log", href: "/dashboard/audit-log", icon: RadioTower },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="surface-card hidden h-full w-72 shrink-0 rounded-r-[28px] border-l-0 border-t-0 border-b-0 bg-white/78 lg:flex lg:flex-col dark:bg-[#15181d]/92">
      <div className="border-b px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-500)] to-[var(--accent-700)] text-white shadow-[var(--shadow-sm)]">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[-0.01em] text-[var(--fg-primary)]">
              CrimeIntel
            </p>
            <p className="text-xs text-[var(--fg-tertiary)]">Crime Intelligence</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-2xl border bg-[var(--bg-subtle)] px-3 py-2.5 text-sm text-[var(--fg-tertiary)]">
          <Search className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate whitespace-nowrap">
            Search
          </span>
          <span className="shrink-0 rounded-md border bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] font-semibold">
            Ctrl K
          </span>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
              {group.title}
            </p>
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-[var(--accent-50)] text-[var(--accent-700)] shadow-[var(--shadow-xs)] dark:bg-[var(--accent-50)]"
                        : "text-[var(--fg-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg-primary)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--fg-tertiary)]">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t px-5 py-4">
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--bg-subtle)] px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-100)] text-sm font-semibold text-[var(--accent-700)]">
            PS
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--fg-primary)]">
              SHO P. Singh
            </p>
            <p className="truncate text-xs text-[var(--fg-tertiary)]">
              Officer, Patna Central
            </p>
          </div>
          <Bell className="h-4 w-4 text-[var(--fg-tertiary)]" />
        </div>
      </div>
    </aside>
  );
}
