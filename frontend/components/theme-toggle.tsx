"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className = "absolute top-6 right-6 z-20" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const storageKey = "theme";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const saved = window.localStorage.getItem(storageKey) as "light" | "dark" | null;
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
        return;
      }
    } catch {
      
    }
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    setTheme(prefersDark ? "dark" : "light");
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      
    }
  }, [theme, mounted]);

  if (!mounted) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={className}
      role="switch"
      aria-checked={theme === "dark"}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
      <span className="text-xs">{theme === "dark" ? "Light" : "Dark"}</span>
    </Button>
  );
}
