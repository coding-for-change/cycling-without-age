"use client";

import { useState, type ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SaveStatusProvider } from "@/components/save-status";
import type { Perspective } from "@/lib/access";
import { AccountDialog } from "./account-dialog";
import { AccountSheet } from "./account-sheet";
import type { AccountData } from "./types";

/**
 * One account surface, two chromes. The breakpoint decides which, and the key
 * makes a flip across it a remount rather than a half-migrated tree.
 *
 * Until it is first opened there is nothing in the tree at all — which is what
 * keeps the hydration flip between the two chromes invisible and what stops
 * `useListPasskeys` firing for everyone who never looks. After that the frame
 * stays so closing still animates; the sections themselves are unmounted by the
 * dialog and the sheet either way.
 */
export function AccountSurface({
  data,
  activePerspective,
  open,
  onOpenChange,
  trigger,
}: {
  data: AccountData;
  activePerspective?: Perspective;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
}) {
  const mobile = useIsMobile();
  const [everOpen, setEverOpen] = useState(open);
  if (open && !everOpen) setEverOpen(true);
  if (!everOpen && !trigger) return null;

  const Chrome = mobile ? AccountSheet : AccountDialog;

  return (
    <SaveStatusProvider>
      <Chrome
        key={mobile ? "sheet" : "dialog"}
        data={data}
        activePerspective={activePerspective}
        open={open}
        onOpenChange={onOpenChange}
        trigger={trigger}
      />
    </SaveStatusProvider>
  );
}
