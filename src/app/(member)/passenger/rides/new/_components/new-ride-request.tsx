import Link from "next/link";
import { headers } from "next/headers";
import { CalendarX2, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { membership } from "@/features/membership";
import { JoinActions } from "@/features/membership/components/join-actions";
import { shortAddress } from "@/features/passengers";
import { rideLocations } from "@/features/ride-locations";
import { rideRequests } from "@/features/ride-requests";
import { requireAuth } from "@/lib/auth-guards";
import { bookableDays, windowLabel } from "@/lib/booking-windows";
import { firstDayOfWeek } from "@/lib/calendar";
import {
  formatList,
  formatLongDateWithWeekday,
  resolveLocale,
  wordsLocale,
} from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { first } from "@/lib/search-params";
import { maxRidersFor, ridersToBook } from "@/use-cases/submit-ride-request";
import { ChapterMail } from "../../_components/chapter-mail";
import { RideRequestForm, type RequestFormData } from "./ride-request-form";

const PEOPLE = "/passenger/profile/people";

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
  const [chapter, { settings, hours, policy }, locations, seats, destinations] =
    await Promise.all([
      chapters.getChapter(chapterId),
      chapters.getBookingPolicy(chapterId, now),
      rideLocations.listRideLocations([chapterId]),
      fleet.maxSeats(chapterId),
      rideRequests.previousDestinations(session.user.id),
    ]);
  if (!chapter) return null;

  const days = bookableDays(hours, policy, chapter.timeZone, now);

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

  const data: RequestFormData = {
    chapterName: chapter.name,
    weekStartsOn: firstDayOfWeek(notation),
    maxRiders: maxRidersFor(seats),
    riders: bookable.map((rider) => ({
      id: rider.id,
      firstName: rider.firstName,
      name: `${rider.firstName} ${rider.lastName}`.trim(),
      careCenterId: rider.careCenterId,
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
    locations: locations.map((location) => ({
      id: location.id,
      name: location.name,
      address: location.address,
      kind: location.kind,
    })),
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

  return (
    <RideRequestForm
      data={data}
      strings={strings}
      address={dict.common.address}
      route={dict.common.route}
      errors={{ ...dict.common.errors, ...strings.errors }}
      stepTemplate={dict.common.stepProgress}
      language={language}
      notation={notation}
    />
  );
}
