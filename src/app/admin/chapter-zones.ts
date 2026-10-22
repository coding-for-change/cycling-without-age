import { chapters } from "@/features/chapters";
import { calendarTimeZone } from "./calendar-scope";

export type ZoneOf = (chapterId?: string | null) => string;

export function zoneLookup(
  zones: { id: string; name: string; timeZone: string }[],
): ZoneOf {
  const byId = new Map(zones.map((zone) => [zone.id, zone.timeZone]));
  const scope = calendarTimeZone(zones).timeZone;
  return (chapterId) => (chapterId ? byId.get(chapterId) : undefined) ?? scope;
}

export const chapterZones = async (chapterIds: string[]) =>
  zoneLookup(await chapters.getChapterTimeZones([...new Set(chapterIds)]));
