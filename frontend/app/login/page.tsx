"use client";

import { Shield } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="dark relative min-h-screen overflow-hidden text-white">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
      >
        <source src="/hud.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/75" />

      <div className="relative z-10 min-h-[calc(100vh-56px)]">
        <div className="grid min-h-[calc(100vh-56px)] grid-cols-1 lg:grid-cols-2 overflow-visible">
        <div className="hidden lg:flex flex-col justify-center px-16">
          <div className="max-w-xl space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-400" />
              <div>
                <h2 className="text-xl font-semibold tracking-wide">
                  CRIMEMAP
                </h2>
                <p className="text-sm text-zinc-400">
                  Analytics & Prediction System
                </p>
              </div>
            </div>

            <h1 className="text-4xl font-bold leading-tight">
              CRIME HOTSPOT
              <br />
              MAPPING TOOL
            </h1>

            <p className="text-zinc-300">
              Sign in to access hotspot analytics, FIR data, and patrol insights.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 overflow-visible">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 p-8 shadow-2xl overflow-visible">
            <LoginForm onSwitch={() => {}} />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
