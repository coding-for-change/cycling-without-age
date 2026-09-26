import { formatPlural, type Locale } from "@/lib/format";

export const countOrNone = (
  count: number,
  forms: { none: string; one: string; other: string },
  words: Locale,
) => (count === 0 ? forms.none : formatPlural(count, forms, words));
