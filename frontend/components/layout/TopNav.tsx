"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";

export default function TopNav() {
  const pathname = usePathname();
  const isAuth = pathname === "/login" || pathname === "/signup";

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/85 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-6">
        {isAuth ? (
          <Link href="/landing_page" className="text-sm text-zinc-300 hover:underline">
            Back to home
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-semibold tracking-wide">CRIMEMAP</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Link
            href="/landing_page"
            className="text-sm text-zinc-300 hover:underline"
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-300 hover:underline"
          >
            Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-zinc-700 px-3 py-1 text-sm text-zinc-100 hover:bg-zinc-900"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-900 hover:bg-white"
          >
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  );
}
