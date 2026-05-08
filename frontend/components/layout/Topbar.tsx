"use client";

import { Bell, CalendarDays, ChevronRight, LogOut, Moon, Plus, Sparkles, Sun } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PAGE_TITLES: Record<string, { title: string; eyebrow: string }> = {
  "/dashboard": { title: "Dashboard", eyebrow: "Operations overview" },
  "/dashboard/hotspots": { title: "Hotspot Map", eyebrow: "Spatial intelligence" },
  "/dashboard/firs": { title: "FIRs", eyebrow: "Case intake" },
  "/dashboard/analytics": { title: "Analytics", eyebrow: "Forecast and trends" },
  "/dashboard/patrols": { title: "Patrol", eyebrow: "Field deployment" },
  "/dashboard/irad": { title: "Road Safety", eyebrow: "Road safety layer" },
  "/dashboard/women-safety": { title: "Women Safety", eyebrow: "Safety intelligence" },
  "/dashboard/geo-fences": { title: "Geo-Fences", eyebrow: "Boundary monitoring" },
  "/dashboard/reports": { title: "Reports", eyebrow: "Export and briefing" },
  "/dashboard/users": { title: "Users", eyebrow: "Admin controls" },
  "/dashboard/audit-log": { title: "Audit Log", eyebrow: "Admin controls" },
  "/dashboard/settings": { title: "Settings", eyebrow: "Preferences and system" },
};

export default function Topbar() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] || PAGE_TITLES["/dashboard"];
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = window.localStorage.getItem("theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    document.body.classList.toggle("dark", theme === "dark");
    try {
      window.localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("authToken");
      window.localStorage.removeItem("authUser");
    }
    router.push("/landing_page");
  };

  return (
    <header className="border-b border-[var(--border-default)] bg-white/55 px-5 py-4 backdrop-blur-xl dark:bg-[#15181d]/78 md:px-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--fg-tertiary)]">
            <span>Patna Central</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>{title.eyebrow}</span>
          </div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
            {title.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 rounded-2xl border bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--fg-secondary)] shadow-[var(--shadow-xs)] md:flex">
            <CalendarDays className="h-4 w-4 text-[var(--accent-500)]" />
            <span>Last 7 days</span>
          </div>

          <button className="flex items-center gap-2 rounded-2xl border bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--fg-secondary)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg-primary)]">
            <Sparkles className="h-4 w-4 text-[var(--accent-500)]" />
            Brief
          </button>

          <button
            className="flex items-center gap-2 rounded-2xl border bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--fg-secondary)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg-primary)]"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            aria-label="Toggle dark and light mode"
            type="button"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Light" : "Dark"}
          </button>

          <button className="flex h-10 w-10 items-center justify-center rounded-2xl border bg-[var(--bg-surface)] text-[var(--fg-secondary)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg-primary)]">
            <Bell className="h-4 w-4" />
          </button>

          <button className="flex items-center gap-2 rounded-2xl bg-[var(--accent-500)] px-3.5 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--accent-600)]">
            <Plus className="h-4 w-4" />
            Register FIR
          </button>

          <button
            className="flex items-center gap-2 rounded-2xl border border-[var(--risk-high)]/20 bg-[var(--risk-high-bg)] px-3 py-2 text-sm font-medium text-[var(--risk-high)] transition hover:opacity-90"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
