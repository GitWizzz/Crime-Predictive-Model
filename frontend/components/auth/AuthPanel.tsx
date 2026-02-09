"use client";

import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="w-full max-w-md rounded-2xl bg-zinc-950 p-8 shadow-2xl overflow-visible">
      {mode === "login" ? (
        <LoginForm onSwitch={() => setMode("signup")} />
      ) : (
        <SignupForm onSwitch={() => setMode("login")} />
      )}
    </div>
  );
}
