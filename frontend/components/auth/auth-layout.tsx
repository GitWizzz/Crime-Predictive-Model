// components/auth/auth-layout.tsx
import { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {children}
    </div>
  );
}
