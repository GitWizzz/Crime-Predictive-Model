"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function TopNav() {
  const pathname = usePathname();
  const isAuth = pathname === "/login" || pathname === "/signup";

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur dark:bg-zinc-950/80">
      <div className="flex h-14 items-center justify-between px-6">
        {isAuth ? (
          <Link href="/landing_page" className="text-sm text-zinc-700 hover:underline dark:text-zinc-300">
            Back to home
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            <span className="text-sm font-semibold tracking-wide">CRIMEMAP</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Link
            href="/landing_page"
            className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
          >
            Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-zinc-200/70 px-3 py-1 text-sm text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Sign up
          </Link>
          <ThemeToggle className="z-20" />
        </div>
      </div>
    </nav>
  );
}