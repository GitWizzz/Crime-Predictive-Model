"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import logo from "../icons/logo.jpeg"

export default function TopNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAuth = pathname === "/login" || pathname === "/signup";
  const isLanding = pathname === "/landing_page";
  const isDarkChrome = isLanding || isAuth;
  const isDashboard = pathname?.startsWith("/dashboard");
  const hideNav = pathname === "/dashboard/firs" && searchParams.get("compose") === "1";
  const navLinkClass = (active: boolean) =>
    isDarkChrome
      ? `rounded-sm px-3 py-2 text-sm font-semibold transition ${
          active
            ? "bg-[#052e16] text-[#22c55e]"
            : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
        }`
      : `rounded-xl px-3 py-2 text-sm font-medium transition ${
          active
            ? "bg-[var(--bg-subtle)] text-[var(--fg-primary)]"
            : "text-[var(--fg-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg-primary)]"
        }`;

  if (hideNav) {
    return null;
  }

  return (
    <nav
      className={`sticky top-0 z-1000 w-full border-b backdrop-blur-xl ${
        isDarkChrome
          ? "border-white/10 bg-[#0d0f12]/95 text-zinc-100"
          : "border-[var(--border-default)] bg-[var(--bg-surface)]/90"
      }`}
    >
      <div className="flex h-16 items-center justify-between px-5 md:px-7">
        {isAuth ? (
          <Link
            href="/landing_page"
            className="inline-flex items-center gap-2 rounded-sm border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-[#22c55e]/40 hover:bg-[#22c55e]/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        ) : (
          <Link href="/landing_page" className="inline-flex items-center gap-2">
            <Image src={logo} alt="Logo" className="h-12 w-12 rounded-full" />
            <span className={`font-bold text-3xl ${isDarkChrome ? "text-[#22c55e]" : "text-[var(--accent-500)]"}`}>CrimeIntel</span>
          </Link>
        )}

        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/landing_page"
            className={navLinkClass(isLanding)}
          >
            Home
          </Link>
          {!isDashboard && pathname !== "/login" && (
            <Link
              href="/login"
              className={
                isDarkChrome
                  ? "rounded-sm border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-[#22c55e]/40 hover:bg-[#22c55e]/10"
                  : "rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--fg-primary)] transition hover:bg-[var(--bg-subtle)]"
              }
            >
              Sign in
            </Link>
          )}
          {!isDashboard && pathname !== "/signup" && (
            <Link
              href="/signup"
              className={
                isDarkChrome
                  ? "rounded-sm bg-[#22c55e] px-4 py-2 text-sm font-bold text-white shadow-[var(--shadow-sm)] transition hover:bg-[#16a34a]"
                  : "rounded-xl bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--accent-600)]"
              }
            >
              Create account
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
