"use client";

import { toast } from "sonner";
import { haptics } from "@/lib/native/haptics";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type NotifyLabels = {
  done: string;
  errors: { generic: string } & Record<string, string>;
};

export function notify(result: ActionResult, labels: NotifyLabels) {
  if (result.ok) {
    toast.success(labels.done);
    haptics.success();
    return;
  }
  toast.error(labels.errors[result.error] ?? labels.errors.generic);
  haptics.error();
}

export type SaveLabels = {
  saved: string;
  undo: string;
  undone: string;
  errors: { generic: string } & Record<string, string>;
};

/**
 * The half of an autosave that is the same wherever one happens: report the
 * outcome, fire exactly one haptic, and offer Undo on a first save but not on
 * the undo of one. The optimistic bookkeeping stays with the caller, whose
 * notion of "the value this replaced" differs per surface.
 */
export function reportSave(
  result: ActionResult,
  {
    report,
    labels,
    undo,
  }: {
    report: (state: "saving" | "saved" | "failed") => void;
    labels: SaveLabels;
    undo?: () => void;
  },
): boolean {
  if (!result.ok) {
    report("failed");
    haptics.error();
    toast.error(labels.errors[result.error] ?? labels.errors.generic);
    return false;
  }
  report("saved");
  haptics.success();
  toast.success(undo ? labels.saved : labels.undone, {
    action: undo ? { label: labels.undo, onClick: undo } : undefined,
  });
  return true;
}
