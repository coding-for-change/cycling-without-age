"use client";

import { useSyncExternalStore } from "react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

const subscribe = () => () => {};
const isMacClient = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

/**
 * A hint, not a control: the palette holds nothing the sidebar, switcher,
 * picker or user menu cannot also do, so nothing here is keyboard-only.
 *
 * The modifier is a client-only fact, read through `useSyncExternalStore` so the
 * server renders the Mac form and the browser corrects it during hydration —
 * setting state in an effect would flash the wrong key and trip
 * `react-hooks/set-state-in-effect`.
 */
export function CommandHint({ label }: { label: string }) {
  const mac = useSyncExternalStore(subscribe, isMacClient, () => true);

  return (
    <p className="flex items-center gap-1.5 px-2 py-1 text-xs text-ink-faint group-data-[collapsible=icon]:hidden">
      <KbdGroup>
        <Kbd>{mac ? "\u2318" : "Ctrl"}</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
      <span>{label}</span>
    </p>
  );
}
