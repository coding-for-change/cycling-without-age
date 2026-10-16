"use client";

import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SaveStatusProvider } from "@/components/save-status";
import { AccountDialog } from "./account-dialog";
import { AccountSheet } from "./account-sheet";
import type { AccountChromeProps } from "./types";

export function AccountSurface(props: AccountChromeProps) {
  const mobile = useIsMobile();
  const [everOpen, setEverOpen] = useState(props.open);
  if (props.open && !everOpen) setEverOpen(true);
  if (!everOpen && !props.trigger) return null;

  const Chrome = mobile ? AccountSheet : AccountDialog;

  return (
    <SaveStatusProvider>
      <Chrome
        key={mobile ? "sheet" : "dialog"}
        {...props}
      />
    </SaveStatusProvider>
  );
}
