"use client";

import { useState } from "react";
import {
  reportSave,
  type ActionResult,
  type SaveLabels,
} from "@/components/action-feedback";
import { useSaveStatus } from "@/components/save-status";

export function useOptimisticSave<V>(
  value: V,
  onSave: (next: V, previous: V) => Promise<ActionResult>,
  labels: SaveLabels,
) {
  const report = useSaveStatus();
  const [override, setOverride] = useState<{ from: V; to: V } | null>(null);
  const shown = override && override.from === value ? override.to : value;

  const persist = async (next: V, previous: V, undoable = true) => {
    setOverride({ from: previous, to: next });
    report("saving");
    const ok = reportSave(await onSave(next, previous), {
      report,
      labels,
      undo: undoable ? () => void persist(previous, next, false) : undefined,
    });
    if (!ok) setOverride(null);
  };

  return { shown, persist };
}
