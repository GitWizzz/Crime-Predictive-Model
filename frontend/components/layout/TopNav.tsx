"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";

export default function TopNav() {
  const pathname = usePathname();
  const isAuth = pathname === "/login" || pathname === "/signup";

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-[var(--border-default)] bg-[var(--bg-surface)]/85 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-6">
        {isAuth ? (
          <Link href="/landing_page" className="text-sm text-[var(--fg-secondary)] hover:underline">
            Back to home
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-[var(--fg-primary)]">
            <Shield className="h-5 w-5 text-[var(--accent-500)]" />
            <span className="text-sm font-semibold tracking-wide">CRIMEMAP</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Link
            href="/landing_page"
            className="text-sm text-[var(--fg-secondary)] hover:underline"
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-[var(--fg-secondary)] hover:underline"
          >
            Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-md border px-3 py-1 text-sm text-[var(--fg-primary)] hover:bg-[var(--bg-subtle)]"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-[var(--accent-500)] px-3 py-1 text-sm font-medium text-white hover:bg-[var(--accent-600)]"
          >
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  );
}
