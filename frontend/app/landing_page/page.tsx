"use client";

import { Shield } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden text-zinc-900 dark:text-white">
      
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
      >
        <source src="/hud.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-white/40 dark:bg-black/80 transition-colors" />

      <div className="relative z-10 min-h-[calc(100vh-56px)]">
        <div className="grid min-h-[calc(100vh-56px)] grid-cols-1 lg:grid-cols-2 overflow-visible">

        <div className="hidden lg:flex flex-col justify-center px-16">
          <div className="max-w-xl space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-500" />
              <div>
                <h2 className="text-xl font-semibold tracking-wide">
                  CRIMEMAP
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Analytics & Prediction System
                </p>
              </div>
            </div>

            <h1 className="text-4xl font-bold leading-tight">
              CRIME HOTSPOT
              <br />
              MAPPING TOOL
            </h1>

            <p className="text-zinc-700 dark:text-zinc-300">
              Advanced predictive analytics for law enforcement agencies
              across India.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 overflow-visible">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 p-8 shadow-2xl">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold">Access Portal</h2>
              <p className="text-sm text-zinc-400">
                Sign in to continue or create a new account.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href="/login"
                className="block w-full rounded-md bg-zinc-100 px-4 py-2 text-center font-medium text-zinc-900 hover:bg-zinc-200"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="block w-full rounded-md border border-zinc-700 px-4 py-2 text-center font-medium text-zinc-100 hover:border-zinc-500"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
