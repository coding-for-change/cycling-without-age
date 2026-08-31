"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { CharacterProvider } from "@/components/character";
import { useCanGoBack } from "@/hooks/use-can-go-back";
import { cn } from "@/lib/utils";
import { CharacterStage } from "./character-stage";
import { FlowStateProvider } from "./flow-state";

const NO_BACK = new Set(["/welcome"]);

export function FlowChrome({
  children,
  backLabel,
}: {
  children: ReactNode;
  backLabel: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const showBack = useCanGoBack() && !NO_BACK.has(pathname);

  return (
    <FlowStateProvider>
      <CharacterProvider>
        <div className="relative flex min-h-dvh flex-col bg-canvas">
          <div className="fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-30 flex items-center gap-4">
            {showBack && (
              <button
                type="button"
                onClick={() => router.back()}
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full",
                  "bg-grey-tint text-ink transition-colors hover:bg-line",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
                )}
              >
                <ChevronLeft
                  className="size-6"
                  aria-hidden
                />
                <span className="sr-only">{backLabel}</span>
              </button>
            )}
            {/* Desktop only — the mobile screens keep the top edge clear for the step itself. */}
            <Image
              src="/logo.png"
              alt="Cycling Without Age"
              width={112}
              height={40}
              className="hidden h-10 w-auto lg:block"
            />
          </div>

          <CharacterStage pathname={pathname}>{children}</CharacterStage>
        </div>
      </CharacterProvider>
    </FlowStateProvider>
  );
}
