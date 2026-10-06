import { headers } from "next/headers";
import { chapters as chapterFeature } from "@/features/chapters";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { RIDE_MAX_MINUTES, RIDE_MIN_MINUTES, wallSlot } from "@/features/rides";
import {
  isPilot,
  toPassengerChoice,
  toPilotChoice,
} from "@/features/rides/components/crew-choices";
import {
  addDays,
  dayKey,
  firstDayOfWeek,
  MINUTES_IN_DAY,
  wallClock,
} from "@/lib/calendar";
import {
  clockToMinutes,
  DEFAULT_SLOT_MINUTES,
  minutesToClock,
} from "@/lib/clock";
import { rideErrors } from "@/features/rides/components/strings";
import { formatDuration, resolveLocale, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { first } from "@/lib/search-params";
import { readActiveScope, type AdminSearchParams } from "../../active-scope";
import { readWeekAnchor } from "../../week-param";
import {
  ScheduleRideDrawer,
  type ScheduleChapter,
  type ScheduleCrew,
} from "./schedule-ride-drawer";

const STAYS = [15, 30, 45, 60, 90, 120, 180, 240, 360];
const LAST_START_HOUR = 20;
const MORNING = "10:00";

function requestedSlot(params: AdminSearchParams) {
  const date = first(params.date);
  const start = first(params.start);
  const end = first(params.end);
  if (!date || !start) return null;
  const ended = end !== undefined && /^([01]\d|2[0-3]):[0-5]\d$/.test(end);
  const minutes = ended
    ? (clockToMinutes(end) - clockToMinutes(start) + MINUTES_IN_DAY) %
        MINUTES_IN_DAY || MINUTES_IN_DAY
    : DEFAULT_SLOT_MINUTES;
  const parsed = wallSlot.safeParse({
    date,
    start,
    durationMinutes: Math.min(
      Math.max(minutes, RIDE_MIN_MINUTES),
      RIDE_MAX_MINUTES,
    ),
  });
  return parsed.success ? { ...parsed.data, durationChosen: ended } : null;
}

/**
 * Where the date and start begin: the week being looked at when it lies ahead,
 * otherwise the next full hour on the chapter's own clock.
 */
function defaultSlot(
  params: AdminSearchParams,
  timeZone: string,
  weekStartsOn: number,
  now: Date,
) {
  const requested = requestedSlot(params);
  if (requested) return requested;
  const week = params.week;
  const today = dayKey(now, timeZone);
  const viewed = dayKey(
    readWeekAnchor(week, timeZone, weekStartsOn, now),
    timeZone,
  );
  const durationMinutes = DEFAULT_SLOT_MINUTES;
  if (viewed > today) return { date: viewed, start: MORNING, durationMinutes };
  const { hour } = wallClock(now, timeZone);
  if (hour >= LAST_START_HOUR)
    return {
      date: dayKey(addDays(now, 1, timeZone), timeZone),
      start: MORNING,
      durationMinutes,
    };
  return {
    date: today,
    start: minutesToClock((hour + 1) * 60),
    durationMinutes,
  };
}

async function loadCrew(chapterIds: string[]): Promise<ScheduleCrew> {
  const [riders, members] = await Promise.all([
    passengers.listPassengersOfChapters(chapterIds),
    membership.listMembersOfChapters(chapterIds),
  ]);
  return {
    passengers: riders.map((passenger) => ({
      ...toPassengerChoice(passenger),
      chapterId: passenger.chapterId,
    })),
    pilots: members.filter(isPilot).map((member) => ({
      ...toPilotChoice(member),
      chapterId: member.organizationId,
    })),
  };
}

export async function ScheduleRide({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const { chapterIds } = await readActiveScope(searchParams, "rides");
  if (!chapterIds.length) return null;

  const [found, dict, language, head] = await Promise.all([
    chapterFeature.getChapters(chapterIds),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  if (!found.length) return null;

  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const weekStartsOn = firstDayOfWeek(locale);
  const now = new Date();

  const chapters: ScheduleChapter[] = found
    .toSorted((a, b) => a.name.localeCompare(b.name, language))
    .map((chapter) => ({
      id: chapter.id,
      name: chapter.name,
      timeZone: chapter.timeZone,
      address: chapter.address,
      latitude: chapter.latitude,
      longitude: chapter.longitude,
      ...defaultSlot(params, chapter.timeZone, weekStartsOn, now),
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
      crew={
        params.new === "1"
          ? loadCrew(chapterIds)
          : Promise.resolve({ passengers: [], pilots: [] })
      }
      stays={choices(STAYS)}
      locale={locale}
      language={language}
      strings={dict.rides.schedule}
      when={dict.rides.when}
      people={dict.rides.people}
      gallery={dict.common.gallery}
      photos={dict.rides.detail.photos}
      address={dict.common.address}
      markdown={dict.common.markdown}
      models={dict.calendar.models}
      errors={rideErrors(dict)}
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
