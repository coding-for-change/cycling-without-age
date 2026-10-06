"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TOOLBAR =
  "sticky top-[env(safe-area-inset-top,0px)] z-20 -mx-4 border-b border-line bg-canvas/90 px-4 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/75 lg:-mx-6 lg:px-6";

const FADE =
  "transition-[border-color] duration-200 data-[stuck=false]:border-transparent motion-reduce:transition-none";

export function StickyToolbar({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const toolbar = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const node = toolbar.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const top = Number.parseFloat(getComputedStyle(node).top) || 0;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setStuck(
          entry.intersectionRatio < 1 &&
            entry.boundingClientRect.top <= top + 1,
        ),
      { rootMargin: `-${Math.ceil(top) + 1}px 0px 0px 0px`, threshold: [1] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={toolbar}
      role="toolbar"
      aria-label={label}
      data-stuck={stuck}
      className={cn(TOOLBAR, FADE, className)}
    >
      {children}
    </div>
  );
}

export function StickyToolbarSkeleton({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn(TOOLBAR, "border-transparent", className)}
    >
      {children ?? (
        <div className="flex h-8 items-center gap-3">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="hidden h-8 w-28 rounded-lg md:block" />
          <Skeleton className="hidden h-4 w-32 md:block" />
          <Skeleton className="ml-auto h-8 w-32 rounded-lg" />
        </div>
      )}
    </div>
  );
}
