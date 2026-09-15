"use client";

import { useState, type ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SaveStatusProvider } from "@/components/save-status";
import type { Perspective } from "@/lib/access";
import { AccountDialog } from "./account-dialog";
import { AccountSheet } from "./account-sheet";
import type { AccountData } from "./types";

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
