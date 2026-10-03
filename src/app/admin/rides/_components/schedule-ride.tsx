import { headers } from "next/headers";
import { chapters as chapterFeature } from "@/features/chapters";
import { addDays, dayKey, firstDayOfWeek, wallClock } from "@/lib/calendar";
import { formatDuration, resolveLocale, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { readActiveScope, type AdminSearchParams } from "../../active-scope";
import { readWeekAnchor } from "../../week-param";
import {
  ScheduleRideDrawer,
  type ScheduleChapter,
} from "./schedule-ride-drawer";

const DURATIONS = [30, 45, 60, 90, 120, 150, 180, 240];
const STAYS = [15, 30, 45, 60, 90, 120, 180, 240, 360];
const LAST_START_HOUR = 20;
const MORNING = "10:00";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Where the date and start begin: the week being looked at when it lies ahead,
 * otherwise the next full hour on the chapter's own clock.
 */
function defaultSlot(
  week: string | string[] | undefined,
  timeZone: string,
  weekStartsOn: number,
  now: Date,
) {
  const today = dayKey(now, timeZone);
  const viewed = dayKey(
    readWeekAnchor(week, timeZone, weekStartsOn, now),
    timeZone,
  );
  if (viewed > today) return { date: viewed, start: MORNING };
  const { hour } = wallClock(now, timeZone);
  if (hour >= LAST_START_HOUR)
    return {
      date: dayKey(addDays(now, 1, timeZone), timeZone),
      start: MORNING,
    };
  return { date: today, start: `${pad(hour + 1)}:00` };
}

export async function ScheduleRide({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const { chapterIds } = await readActiveScope(searchParams, "rides");
  if (!chapterIds.length) return null;

  const [params, zones, dict, language, head] = await Promise.all([
    searchParams,
    chapterFeature.getChapterTimeZones(chapterIds),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  if (!zones.length) return null;

  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const weekStartsOn = firstDayOfWeek(locale);
  const now = new Date();

  const chapters: ScheduleChapter[] = zones.map((chapter) => ({
    id: chapter.id,
    name: chapter.name,
    timeZone: chapter.timeZone,
    ...defaultSlot(params.week, chapter.timeZone, weekStartsOn, now),
  }));

  const choices = (minutes: number[]) =>
    minutes.map((value) => ({
      value,
      label: formatDuration(value * 60, words),
    }));

  const { common, allocation } = dict.fleet;

  return (
    <ScheduleRideDrawer
      chapters={chapters}
      durations={choices(DURATIONS)}
      stays={choices(STAYS)}
      locale={locale}
      language={language}
      strings={dict.rides.schedule}
      models={dict.calendar.models}
      errors={dict.rides.errors}
      fleet={{
        pool: common.pool,
        wheelchair: common.wheelchair,
        damaged: common.damaged,
        selected: allocation.selected,
        nothingSelected: allocation.nothingSelected,
      }}
    />
  );
}
