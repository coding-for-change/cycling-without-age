import { headers } from "next/headers";
import { chapters as chapterFeature } from "@/features/chapters";
import { DEFAULT_CHAPTER_SETTINGS } from "@/features/chapters/schemas";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { rideRequests, type RideRequestRow } from "@/features/ride-requests";
import { rideLocations } from "@/features/ride-locations";
import {
  RIDE_MAX_MINUTES,
  RIDE_MIN_MINUTES,
  slotOf,
  wallSlot,
} from "@/features/rides";
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
import { NO_HOURS } from "@/lib/operating-hours";
import { first } from "@/lib/search-params";
import { readinessForChapters } from "@/use-cases/pilot-readiness";
import {
  withReadiness,
  type ReadinessHintLabels,
} from "../../_components/pilot-choices";
import { readActiveScope, type AdminSearchParams } from "../../active-scope";
import { readWeekAnchor } from "../../week-param";
import {
  ScheduleRideDrawer,
  type RequestPrefill,
  type ScheduleChapter,
  type ScheduleCrew,
} from "./schedule-ride-drawer";
import type { HoursPolicy } from "./hours-warnings";
import type { RideLocationChoice } from "./ride-location-field";

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

type Planning = {
  policy: HoursPolicy;
  rideMinutes: number;
  stayMinutes: number;
  requiredPilots: number;
};

async function loadPlanning(chapterIds: string[]) {
  const [hours, settings] = await Promise.all([
    chapterFeature.getOperatingHoursOf(chapterIds),
    chapterFeature.getSettingsOf(chapterIds),
  ]);
  return new Map<string, Planning>(
    chapterIds.map((id) => {
      const { windows, closures, closureReasons } = hours.get(id) ?? {
        ...NO_HOURS,
        closureReasons: {},
      };
      const policy = settings.get(id) ?? DEFAULT_CHAPTER_SETTINGS;
      return [
        id,
        {
          policy: {
            hours: { windows, closures },
            closureReasons,
            leadTimeHours: policy.bookingLeadTimeHours,
            horizonDays: policy.bookingHorizonDays,
          },
          rideMinutes: policy.defaultRideMinutes,
          stayMinutes: policy.defaultStayMinutes,
          requiredPilots: policy.requiredPilotsDefault,
        },
      ];
    }),
  );
}

const toChoice = (
  location: Awaited<ReturnType<typeof rideLocations.listRideLocations>>[number],
): RideLocationChoice => ({
  id: location.id,
  chapterId: location.chapterId,
  kind: location.kind,
  name: location.name,
  address: location.address,
  latitude: location.latitude,
  longitude: location.longitude,
  defaultMinutes: location.defaultMinutes,
});

async function loadCrew(
  chapterIds: string[],
  careHome: string,
  hints: ReadinessHintLabels,
  language: string,
): Promise<ScheduleCrew> {
  const [riders, members] = await Promise.all([
    passengers.listPassengersOfChapters(chapterIds),
    membership.listMembersOfChapters(chapterIds),
  ]);
  const pilots = members.filter(isPilot);
  const readiness = await readinessForChapters(
    chapterIds.map((chapterId) => ({
      chapterId,
      userIds: pilots
        .filter((member) => member.organizationId === chapterId)
        .map((member) => member.userId),
    })),
    language,
  );
  return {
    passengers: riders.map((passenger) => ({
      ...toPassengerChoice(passenger, careHome),
      chapterId: passenger.chapterId,
    })),
    pilots: withReadiness(
      pilots.map((member) => ({
        ...toPilotChoice(member),
        chapterId: member.organizationId,
      })),
      (choice) => readiness.get(choice.chapterId)?.get(choice.id),
      hints,
    ),
  };
}

const placeOf = (
  name: string | null,
  address: string | null,
  latitude: number | null,
  longitude: number | null,
) =>
  name && latitude !== null && longitude !== null
    ? { name, address: address ?? name, latitude, longitude }
    : null;

/**
 * The drawer opened from a Ride Request starts from what was asked for: the
 * riders, the place, the destination and the start of the window, at the
 * chapter's usual ride length. The Action re-reads the request, so nothing
 * here is trusted on the way back.
 */
function prefillOf(
  request: RideRequestRow,
  rideMinutes: number,
): RequestPrefill {
  const slot = slotOf(
    {
      startsAt: request.requestedStartsAt,
      endsAt: new Date(
        Math.min(
          request.requestedEndsAt.getTime(),
          request.requestedStartsAt.getTime() + rideMinutes * 60_000,
        ),
      ),
    },
    request.chapter.timeZone,
  );
  return {
    id: request.id,
    chapterId: request.chapterId,
    name: request.requester?.name ?? null,
    model: request.model === "functional" ? "functional" : "pleasure",
    slot,
    rideLocationId: request.rideLocationId,
    origin: placeOf(
      request.pickupName,
      request.pickupAddress,
      request.pickupLatitude,
      request.pickupLongitude,
    ),
    destination: placeOf(
      request.destinationName,
      request.destinationAddress,
      request.destinationLatitude,
      request.destinationLongitude,
    ),
    roundTrip: request.roundTrip,
    passengerIds: request.passengers.map(({ passenger }) => passenger.id),
    note: request.note,
  };
}

async function pendingRequest(id: string | undefined, chapterIds: string[]) {
  if (!id) return null;
  const request = await rideRequests.getRequest(id.slice(0, 64));
  return request &&
    request.status === "pending" &&
    chapterIds.includes(request.chapterId)
    ? request
    : null;
}

export async function ScheduleRide({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const { chapterIds } = await readActiveScope(searchParams, "rides");
  if (!chapterIds.length) return null;

  const opening = params.new === "1";
  const [found, dict, language, head, planning, places, request] =
    await Promise.all([
      chapterFeature.getChapters(chapterIds),
      getDictionary(),
      getLocale(),
      headers(),
      opening ? loadPlanning(chapterIds) : new Map<string, Planning>(),
      opening ? rideLocations.listRideLocations(chapterIds) : [],
      opening ? pendingRequest(first(params.request), chapterIds) : null,
    ]);
  if (!found.length) return null;

  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const weekStartsOn = firstDayOfWeek(locale);
  const now = new Date();

  const chapters: ScheduleChapter[] = found
    .toSorted((a, b) => a.name.localeCompare(b.name, language))
    .map((chapter) => {
      const plan = planning.get(chapter.id);
      const slot = defaultSlot(params, chapter.timeZone, weekStartsOn, now);
      return {
        id: chapter.id,
        name: chapter.name,
        timeZone: chapter.timeZone,
        address: chapter.address,
        latitude: chapter.latitude,
        longitude: chapter.longitude,
        ...slot,
        ...(plan
          ? {
              policy: plan.policy,
              stayMinutes: plan.stayMinutes,
              requiredPilots: plan.requiredPilots,
              durationMinutes:
                "durationChosen" in slot && slot.durationChosen
                  ? slot.durationMinutes
                  : plan.rideMinutes,
            }
          : {}),
      };
    });

  const choices = (minutes: number[]) =>
    minutes.map((value) => ({
      value,
      label: formatDuration(value * 60, words),
    }));

  const { common, allocation } = dict.fleet;

  return (
    <ScheduleRideDrawer
      chapters={chapters}
      request={
        request
          ? prefillOf(
              request,
              planning.get(request.chapterId)?.rideMinutes ??
                DEFAULT_CHAPTER_SETTINGS.defaultRideMinutes,
            )
          : null
      }
      requestStrings={dict.admin.rideRequests.schedule}
      crew={
        params.new === "1"
          ? loadCrew(
              chapterIds,
              dict.calendar.pickupCareHome,
              dict.admin.training.picker,
              language,
            )
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
      errors={{ ...rideErrors(dict), ...dict.admin.rideRequests.errors }}
      locations={places.map(toChoice)}
      locationStrings={{
        picker: dict.admin.rideLocations.picker,
        kinds: dict.admin.rideLocations.kinds,
      }}
      hoursStrings={{
        warnings: dict.admin.settings.hours.warnings,
        hours: dict.admin.settings.booking.hours,
        days: dict.admin.settings.booking.days,
      }}
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
