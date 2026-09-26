import { formatPlural, type Locale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";

type DeletionStrings = Dictionary["admin"]["deletion"];
type DeletionKey = Exclude<keyof DeletionStrings, "consequences">;

export const deletionConsequences = (
  counts: Partial<Record<DeletionKey, number>>,
  strings: DeletionStrings,
  words: Locale,
) =>
  (Object.entries(counts) as [DeletionKey, number][])
    .filter(([, count]) => count > 0)
    .map(([key, count]) => formatPlural(count, strings[key], words));
