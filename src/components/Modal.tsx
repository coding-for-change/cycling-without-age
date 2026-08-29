"use client";

/* Modal (bottom sheet on mobile, via CSS) and right-side drawer. */

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  drawer = false,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  drawer?: boolean;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(drawer ? "drawer" : "modal", className)}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}
