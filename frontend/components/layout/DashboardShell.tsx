
"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
=======
import { Suspense } from "react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { canAccessRoute, normalizeRole } from "@/lib/rbac";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const access = useMemo(() => {
    if (typeof window === "undefined") {
      return { hasToken: false, allowed: false };
    }

    const token = window.localStorage.getItem("authToken");
    const rawUser = window.localStorage.getItem("authUser");
    let role = normalizeRole(null);

    try {
      role = normalizeRole(rawUser ? JSON.parse(rawUser)?.role : null);
    } catch {
      role = normalizeRole(null);
    }

    return {
      hasToken: Boolean(token),
      allowed: canAccessRoute(role, pathname),
    };
  }, [pathname]);

  useEffect(() => {
    if (!access.hasToken) {
      router.replace("/login");
      return;
    }

    if (!access.allowed) {
      router.replace("/dashboard");
      return;
    }

  }, [access.allowed, access.hasToken, router]);

  if (!access.hasToken || !access.allowed) {
    return (
      <div className="app-shell-bg grid h-[calc(100vh-56px)] place-items-center text-[var(--fg-primary)]">
        <div className="surface-card rounded-[20px] px-5 py-4 text-sm text-[var(--fg-secondary)]">
          Checking dashboard access...
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell-bg relative flex h-[calc(100vh-56px)] overflow-hidden text-[var(--fg-primary)]">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-40" />
      <Suspense>
        <Sidebar />
      </Suspense>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <Suspense>
          <Topbar />
        </Suspense>
        <main className="flex-1 overflow-auto px-4 py-5 md:px-7 md:py-6">{children}</main>
      </div>
    </div>
  );
}
