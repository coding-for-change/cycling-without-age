"use client";

import type { KeyboardEvent, ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Every admin create/edit surface. Slides in from the right on a desk so the
 * list it came from stays in view, and up from the bottom on a phone where it
 * is the whole screen anyway. The list behind it keeps its own scroll.
 */
export function AdminDrawer({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  dismissible = true,
  children,
  footer,
  bodyClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  size?: "md" | "lg";
  dismissible?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
}) {
  const mobile = useIsMobile();
  const direction = mobile ? "bottom" : "right";

  return (
    <Drawer
      key={direction}
      open={open}
      onOpenChange={onOpenChange}
      direction={direction}
      dismissible={dismissible}
      repositionInputs={false}
    >
      <DrawerContent
        className={cn(
          "bg-canvas",
          "data-[vaul-drawer-direction=bottom]:max-h-[94svh] data-[vaul-drawer-direction=bottom]:rounded-t-(--r-tile)",
          "data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:rounded-l-(--r-tile) data-[vaul-drawer-direction=right]:shadow-lift",
          size === "md"
            ? "data-[vaul-drawer-direction=right]:sm:max-w-xl"
            : "data-[vaul-drawer-direction=right]:sm:max-w-4xl",
        )}
      >
        <DrawerHeader className="shrink-0 gap-1 border-b border-line px-5 py-4 text-left md:gap-1 md:px-6">
          <DrawerTitle className="font-display text-lg font-bold tracking-tight text-ink">
            {title}
          </DrawerTitle>
          {description ? (
            <DrawerDescription className="text-sm text-ink-soft">
              {description}
            </DrawerDescription>
          ) : null}
        </DrawerHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6">
            {footer}
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

/** ⌘↵ / Ctrl+↵ submits the form the key was pressed in. */
export function submitOnCmdEnter(event: KeyboardEvent<HTMLFormElement>) {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.requestSubmit();
  }
}
