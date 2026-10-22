import Link from "next/link";
import { headers } from "next/headers";
import { CalendarX2, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { membership } from "@/features/membership";
import { JoinActions } from "@/features/membership/components/join-actions";
import { passengers, shortAddress } from "@/features/passengers";
import { rideRequests } from "@/features/ride-requests";
import { rides } from "@/features/rides";
import { requireAuth } from "@/lib/auth-guards";
import {
  bookableDays,
  bookingDates,
  dayClosure,
  windowLabel,
} from "@/lib/booking-windows";
import { calendarDate, clockMinutes, dayKey } from "@/lib/calendar";
import {
  formatList,
  formatLongDateWithWeekday,
  formatShortDateWithWeekday,
  resolveLocale,
  wordsLocale,
  type Locale as Notation,
} from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { isoWeekday } from "@/lib/operating-hours";
import { first } from "@/lib/search-params";
import { maxRidersFor, ridersToBook } from "@/use-cases/submit-ride-request";
import { ChapterMail } from "../../../../_components/chapter-mail";
import {
  RideRequestForm,
  type RequestFormData,
  type RequestPrefill,
} from "./ride-request-form";

const PEOPLE = "/passenger/profile/people";

type Strings = Dictionary["passenger"]["request"];

const careHomeOf = (chapter: {
  name: string;
  careHomeName: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
}): RequestFormData["careHome"] => {
  const careHomeName = chapter.careHomeName?.trim();
  return {
    name: careHomeName || chapter.name,
    named: Boolean(careHomeName),
    address: chapter.address,
    latitude: chapter.latitude,
    longitude: chapter.longitude,
  };
};

const same = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a?.trim()) && a?.trim() === b?.trim();

async function prefillFrom(
  rideId: string,
  userId: string,
  data: Pick<RequestFormData, "riders" | "careHome">,
  strings: Strings,
  notation: Notation,
  words: Notation,
): Promise<RequestPrefill | null> {
  const own = await passengers.listRidersOfAccount(userId);
  const ride = await rides.getRideForPassengers(
    rideId,
    own.map((rider) => rider.id),
  );
  if (!ride || ride.model === "event" || ride.status !== "scheduled")
    return null;
  const riderIds = ride.roster.flatMap(({ passenger, attendance }) =>
    passenger &&
    attendance !== "cancelled" &&
    data.riders.some((rider) => rider.id === passenger.id)
      ? [passenger.id]
      : [],
  );
  if (!riderIds.length) return null;

  const destinationName =
    ride.destinationName?.trim() || ride.destinationAddress?.trim();

  return {
    source: { kind: "ride", id: ride.id },
    label: formatMessage(
      strings.reschedule.eyebrow,
      {
        date: formatShortDateWithWeekday(
          calendarDate(ride.startsAt, ride.chapter.timeZone),
          notation,
        ),
      },
      words,
    ),
    riderIds,
    model: ride.model,
    start: startOf(
      {
        name: ride.locationName,
        address: ride.locationAddress,
        latitude: ride.latitude,
        longitude: ride.longitude,
      },
      riderIds[0],
      data,
    ),
    destination:
      ride.model === "functional" && destinationName
        ? {
            name: destinationName,
            address: ride.destinationAddress,
            latitude: ride.destinationLatitude,
            longitude: ride.destinationLongitude,
          }
        : null,
    roundTrip: ride.model === "functional" && ride.returnLeg !== null,
    window: null,
    note: null,
  };
}

function startOf(
  place: {
    name: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  },
  leadId: string | undefined,
  data: Pick<RequestFormData, "riders" | "careHome">,
): RequestPrefill["start"] {
  const lead = data.riders.find((rider) => rider.id === leadId);
  const careHome = data.careHome;
  const atCareHome =
    same(careHome.name, place.name) &&
    (!careHome.address ||
      !place.address ||
      same(careHome.address, place.address));
  const name = place.name?.trim() || place.address?.trim();
  return atCareHome
    ? { kind: "careHome" }
    : lead?.home && same(lead.home.address, place.address)
      ? { kind: "home" }
      : name
        ? {
            kind: "place",
            place: {
              name,
              address: place.address,
              latitude: place.latitude,
              longitude: place.longitude,
            },
          }
        : null;
}

async function prefillFromRequest(
  requestId: string,
  userId: string,
  data: Pick<RequestFormData, "riders" | "careHome" | "days">,
  strings: Strings,
  notation: Notation,
  words: Notation,
): Promise<RequestPrefill | null> {
  const request = await rideRequests
    .getChangeable(requestId, userId)
    .catch(() => null);
  if (!request || request.model === "event") return null;
  const riderIds = request.passengers.flatMap(({ passenger }) =>
    data.riders.some((rider) => rider.id === passenger.id)
      ? [passenger.id]
      : [],
  );
  if (!riderIds.length) return null;

  const zone = request.chapter.timeZone;
  const date = dayKey(request.requestedStartsAt, zone);
  const startMinute = clockMinutes(request.requestedStartsAt, zone);
  const endMinute = clockMinutes(request.requestedEndsAt, zone);
  const stillOffered = data.days
    .find((day) => day.date === date)
    ?.windows.some(
      (window) =>
        window.startMinute === startMinute && window.endMinute === endMinute,
    );
  const functional = request.model === "functional";
  const destinationName =
    request.destinationName?.trim() || request.destinationAddress?.trim();

  return {
    source: { kind: "request", id: request.id },
    label: formatMessage(
      strings.change.eyebrow,
      {
        date: formatShortDateWithWeekday(
          calendarDate(request.requestedStartsAt, zone),
          notation,
        ),
      },
      words,
    ),
    riderIds,
    model: request.model,
    start: startOf(
      {
        name: request.pickupName,
        address: request.pickupAddress,
        latitude: request.pickupLatitude,
        longitude: request.pickupLongitude,
      },
      riderIds[0],
      data,
    ),
    destination:
      functional && destinationName
        ? {
            name: destinationName,
            address: request.destinationAddress,
            latitude: request.destinationLatitude,
            longitude: request.destinationLongitude,
          }
        : null,
    roundTrip: functional && request.roundTrip,
    window: stillOffered ? { date, startMinute, endMinute } : null,
    note: request.note,
  };
}

export async function NewRideRequest({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, params] = await Promise.all([requireAuth(), searchParams]);
  const slug = first(params.chapter)?.slice(0, 60);
  const [riders, dict, language, head, asked] = await Promise.all([
    ridersToBook(session.user.id),
    getDictionary(),
    getLocale(),
    headers(),
    slug ? chapters.getChapterBySlug(slug) : null,
  ]);
  const strings = dict.passenger.request;
  const words = wordsLocale(language);
  const notation = resolveLocale(head.get("accept-language"));
  const memberOf = (chapterId: string) =>
    session.access.memberships.some(
      (entry) => entry.chapterId === chapterId && entry.roles.length > 0,
    );

  if (asked && !memberOf(asked.id)) {
    const pendingApplication = (
      await membership.listApplicationsOfUser(session.user.id)
    ).some(
      (application) =>
        application.chapterId === asked.id && application.status === "pending",
    );
    return (
      <>
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
            {asked.name}
          </p>
          <h1 className="text-2xl tracking-tight md:text-3xl">
            {formatMessage(strings.join.title, { chapter: asked.name }, words)}
          </h1>
          <p className="text-ink-soft">{strings.join.body}</p>
        </header>
        <JoinActions
          passengerOnly
          next={`/passenger/rides/new?chapter=${encodeURIComponent(asked.slug)}`}
          chapterId={asked.id}
          pendingApplication={pendingApplication}
          strings={{ passenger: dict.join.passenger, pilot: dict.join.pilot }}
          errors={dict.location.errors}
        />
      </>
    );
  }

  const bookable = riders.filter((rider) => rider.bookable);
  if (!bookable.length)
    return (
      <>
        <h1 className="text-2xl tracking-tight md:text-3xl">{strings.title}</h1>
        {riders.length ? (
          <EmptyState
            icon={CalendarX2}
            title={strings.notMember.title}
            action={
              <Button
                asChild
                variant="outline"
                className="min-h-11 rounded-full px-6"
              >
                <Link href="/passenger">{strings.notMember.cta}</Link>
              </Button>
            }
          >
            {formatMessage(
              strings.notMember.body,
              {
                names: formatList(
                  riders.map((rider) => rider.firstName),
                  words,
                ),
                count: riders.length,
              },
              words,
            )}
          </EmptyState>
        ) : (
          <EmptyState
            icon={UsersRound}
            title={strings.empty.title}
            action={
              <Button
                asChild
                variant="brand"
                className="min-h-11 rounded-full px-6"
              >
                <Link href={PEOPLE}>{strings.empty.cta}</Link>
              </Button>
            }
          >
            {strings.empty.body}
          </EmptyState>
        )}
      </>
    );

  const chapterId = bookable[0].chapterId;
  const now = new Date();
  const [chapter, { settings, hours, policy }, seats, destinations] =
    await Promise.all([
      chapters.getChapter(chapterId),
      chapters.getBookingPolicy(chapterId, now),
      fleet.maxSeats(chapterId),
      rideRequests.previousDestinations(session.user.id),
    ]);
  if (!chapter) return null;

  const days = bookableDays(hours, policy, chapter.timeZone, now);
  const from = first(params.from)?.slice(0, 64);
  const fromRequest = first(params.fromRequest)?.slice(0, 64);

  if (!days.length)
    return (
      <>
        <h1 className="text-2xl tracking-tight md:text-3xl">{strings.title}</h1>
        <EmptyState
          icon={CalendarX2}
          title={strings.noDays.title}
          action={
            settings.replyToEmail?.trim() ? (
              <ChapterMail
                email={settings.replyToEmail.trim()}
                subject={strings.noDays.subject}
                label={dict.passenger.rides.write}
              />
            ) : undefined
          }
        >
          {formatMessage(strings.noDays.body, { chapter: chapter.name }, words)}
        </EmptyState>
      </>
    );

  const firstDay = days[0].date;
  const lastDay = days[days.length - 1].date;
  const open = new Set(days.map((day) => day.date));
  const closedDays = Object.fromEntries(
    bookingDates(policy, chapter.timeZone, now)
      .filter((date) => date > firstDay && date < lastDay && !open.has(date))
      .map((date) => {
        const reason = dayClosure(hours, date);
        return [
          date,
          formatMessage(
            strings.when[reason],
            {
              chapter: chapter.name,
              date: formatLongDateWithWeekday(date, notation),
              weekday: String(isoWeekday(date)),
            },
            words,
          ),
        ];
      }),
  );

  const formData: Omit<RequestFormData, "prefill"> = {
    chapterName: chapter.name,
    automatic: settings.schedulingMethod === "auto",
    closedDays,
    outsideDays: formatMessage(
      strings.when.outsideRange,
      {
        first: formatLongDateWithWeekday(firstDay, notation),
        last: formatLongDateWithWeekday(lastDay, notation),
      },
      words,
    ),
    maxRiders: maxRidersFor(seats),
    riders: bookable.map((rider) => ({
      id: rider.id,
      firstName: rider.firstName,
      name: `${rider.firstName} ${rider.lastName}`.trim(),
      atCareHome: rider.home?.residence === "careHome",
      home:
        rider.home?.residence === "home" && rider.home.address
          ? {
              name: shortAddress(rider.home.address),
              address: rider.home.address,
              latitude: rider.home.latitude,
              longitude: rider.home.longitude,
            }
          : null,
    })),
    stranded: riders
      .filter((rider) => !rider.bookable)
      .map((rider) => rider.firstName),
    careHome: careHomeOf(chapter),
    destinations: destinations.map((place) => ({
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
    })),
    days: days.map((day) => ({
      date: day.date,
      label: formatLongDateWithWeekday(day.date, notation),
      windows: day.windows.map((window) => ({
        startMinute: window.startMinute,
        endMinute: window.endMinute,
        label: window.part
          ? `${strings.when.parts[window.part]} · ${windowLabel(window, notation, chapter.timeZone)}`
          : windowLabel(window, notation, chapter.timeZone),
      })),
    })),
  };
  const data: RequestFormData = {
    ...formData,
    prefill: fromRequest
      ? await prefillFromRequest(
          fromRequest,
          session.user.id,
          formData,
          strings,
          notation,
          words,
        )
      : from
        ? await prefillFrom(
            from,
            session.user.id,
            formData,
            strings,
            notation,
            words,
          )
        : null,
  };

  return (
    <RideRequestForm
      data={data}
      strings={strings}
      address={dict.common.address}
      route={dict.common.route}
      dateTime={dict.common.dateTime}
      errors={{ ...dict.common.errors, ...strings.errors }}
      stepTemplate={dict.common.stepProgress}
      language={language}
      notation={notation}
    />
  );
}
