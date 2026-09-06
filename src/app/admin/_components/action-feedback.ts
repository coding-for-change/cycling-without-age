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
