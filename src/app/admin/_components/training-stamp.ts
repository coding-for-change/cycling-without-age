import { calendarDate } from "@/lib/calendar";
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  wordsLocale,
  type Locale,
} from "@/lib/format";

export type StampContext = {
  notation: Locale;
  words: string;
  timeZone: string;
  now: Date;
};

export const localDate = (at: Date, context: StampContext) =>
  formatDate(calendarDate(at, context.timeZone), context.notation);

export function stampOf(
  at: Date | null,
  context: StampContext,
  relative = false,
) {
  if (!at) return null;
  return {
    at: at.toISOString(),
    label: relative
      ? formatRelativeTime(at, wordsLocale(context.words), context.now)
      : localDate(at, context),
    title: formatDateTime(at, context.notation, context.timeZone),
  };
}
