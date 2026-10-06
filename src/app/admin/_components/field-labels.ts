import type { InlineFieldLabels } from "@/components/inline-field";

export const fieldLabels = (
  { edit, saved, undo, undone, invalid }: Omit<InlineFieldLabels, "errors">,
  errors: InlineFieldLabels["errors"],
): InlineFieldLabels => ({ edit, saved, undo, undone, invalid, errors });
