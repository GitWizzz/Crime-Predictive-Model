import { Suspense } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
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
