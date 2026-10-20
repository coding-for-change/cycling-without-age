"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { arrivedFromApp, currentArrival } from "@/lib/arrival";
import { isPlainClick } from "@/lib/plain-click";

export function LegalBackButton({ label }: { label: ReactNode }) {
  const router = useRouter();

  const back = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainClick(event) || !arrivedFromApp(currentArrival())) return;
    event.preventDefault();
    router.back();
  };

  return (
    <Link
      href="/"
      onClick={back}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-grey-tint text-ink transition-colors hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 motion-reduce:transition-none"
    >
      <ChevronLeft
        className="size-6"
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
