import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";

type DeletionStrings = Dictionary["admin"]["deletion"];
type DeletionKey = Exclude<keyof DeletionStrings, "consequences">;

export const deletionConsequences = (
  counts: Partial<Record<DeletionKey, number>>,
  strings: DeletionStrings,
  locale: Locale,
) =>
  (Object.entries(counts) as [DeletionKey, number][])
    .filter(([, count]) => count > 0)
    .map(([key, count]) => formatMessage(strings[key], { count }, locale));
