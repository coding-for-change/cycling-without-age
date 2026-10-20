"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { preloadTrainingPlayer } from "@/components/training-player-lazy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StartButton({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  const warm = () => void preloadTrainingPlayer();
  return (
    <Button
      asChild
      variant="brand"
      className={cn("min-h-12 rounded-full px-6 text-base", className)}
    >
      <Link
        href={href}
        prefetch
        transitionTypes={["push"]}
        onPointerEnter={warm}
        onFocus={warm}
        onTouchStart={warm}
      >
        {label}
        <ArrowRight aria-hidden />
      </Link>
    </Button>
  );
}
