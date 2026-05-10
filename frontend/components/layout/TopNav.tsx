"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import logo from "../icons/logo.jpeg"

export default function TopNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAuth = pathname === "/login" || pathname === "/signup";
  const isLanding = pathname === "/landing_page";
  const isDashboard = pathname?.startsWith("/dashboard");
  const hideNav = pathname === "/dashboard/firs" && searchParams.get("compose") === "1";
  const navLinkClass = (active: boolean) =>
    `rounded-xl px-3 py-2 text-sm font-medium transition ${
      active
        ? "bg-[var(--bg-subtle)] text-[var(--fg-primary)]"
        : "text-[var(--fg-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg-primary)]"
    }`;

  if (hideNav) {
    return null;
  }

  return (
    <nav
      className="sticky top-0 z-40 w-full border-b border-[var(--border-default)] bg-[var(--bg-surface)]/90 backdrop-blur-xl"
    >
      <div className="flex h-16 items-center justify-between px-5 md:px-7">
        {isAuth ? (
          <Link
            href="/landing_page"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--fg-secondary)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        ) : (
          <Link href="/landing_page" className="inline-flex items-center gap-2">
            <img src={logo.src} alt="Logo" className="h-12 w-12 rounded-full" />
            <span className="font-bold text-3xl text-[var(--accent-500)]">CrimeIntel</span>
          </Link>
        )}

        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/landing_page"
            className={navLinkClass(isLanding)}
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className={navLinkClass(isDashboard)}
          >
            Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--fg-primary)] transition hover:bg-[var(--bg-subtle)]"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--accent-600)]"
          >
            Create account
          </Link>
        </div>
      </div>
    </nav>
  );
}
