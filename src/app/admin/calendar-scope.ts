import { FALLBACK_TIME_ZONE } from "@/lib/time-zone";

type ChapterZone = { id: string; name: string; timeZone: string };

/**
 * Which clock a calendar spanning several chapters should read.
 *
 * One chapter, or several that keep the same zone: there is a right answer and
 * no label is needed. Chapters across zones have no single right answer, so the
 * widest scope picks the first and says whose clock it is rather than showing
 * times that are quietly wrong for everyone else.
 */
export function calendarTimeZone(chapters: ChapterZone[]): {
  timeZone: string;
  label: string | null;
} {
  if (!chapters.length) return { timeZone: FALLBACK_TIME_ZONE, label: null };

  const zones = new Set(chapters.map((c) => c.timeZone));
  if (zones.size === 1) return { timeZone: chapters[0].timeZone, label: null };

  return {
    timeZone: chapters[0].timeZone,
    label: `${chapters[0].timeZone.replace(/_/g, " ")} · ${chapters[0].name}`,
  };
}
