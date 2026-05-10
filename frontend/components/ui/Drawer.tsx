"use client";

import React, { ReactNode, useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  width?: string; // tailwind width e.g. 'w-80'
};

export default function Drawer({ open, onClose, children, width = "w-80" }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-40 flex ${open ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`ml-auto transform transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"} ${width} h-full overflow-auto bg-[var(--bg-surface-raised)] border-l p-0`}
      >
        {children}
      </div>
    </div>
  );
}
