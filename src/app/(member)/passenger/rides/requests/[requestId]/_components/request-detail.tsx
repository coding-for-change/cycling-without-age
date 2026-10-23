import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarClock, CalendarPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { rideRequests, type RideRequestRow } from "@/features/ride-requests";
import { requestedRiders } from "@/features/ride-requests/components/request-words";
import { id as requestId } from "@/features/ride-requests/schemas";
import { OpenInMapsSheet } from "@/features/rides/components/open-in-maps-sheet";
import { rideHeadline } from "@/features/rides/components/ride-presentation";
import { StaticMap } from "@/features/rides/components/static-map";
import { hasStaticMap } from "@/features/rides/components/static-map-url";
import { requireAuth } from "@/lib/auth-guards";
import { calendarDate } from "@/lib/calendar";
import {
  formatDate,
  formatDateMedium,
  formatTime,
  resolveLocale,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { MEMBER_LIFE } from "../../../../../_components/instant";
import { ChapterMail } from "../../../../../_components/chapter-mail";
import { ChapterPhones } from "../../../../../_components/chapter-phones";
import { MemberTitle } from "../../../../../_components/member-title";
import { DetailSection } from "../../../../../_components/ride-detail/detail-section";
import { PersonalHeader } from "../../../../../_components/ride-detail/personal-header";
import { TimelineStop } from "../../../../../_components/ride-detail/timeline-stop";
import { WithdrawRequest } from "./withdraw-request";

export async function RequestDetail({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId: id } = await params;
  if (!requestId.safeParse(id).success) notFound();
  return <OwnRequest id={id} />;
}

type State = RideRequestRow["status"] | "lapsed" | "closed";
type PageStrings = Dictionary["passenger"]["request"]["page"];

async function OwnRequest({ id }: { id: string }) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requireAuth();
  const [request, dict, language, head] = await Promise.all([
    rideRequests.getRequest(id),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  if (!request || request.requesterUserId !== session.user.id) notFound();

  const state: State = rideRequests.lapsed(request)
    ? "lapsed"
    : rideRequests.closed(request)
      ? "closed"
      : request.status;
  const rideGone =
    request.status === "scheduled" &&
    (!request.ride || request.ride.status === "cancelled");
  const booked = state === "scheduled" && !rideGone && request.rideId;

  const [settings, adminPhones] = await Promise.all([
    chapters.getSettings(request.chapter.id),
    state === "pending" || booked
      ? membership.listChapterAdminPhones(request.chapter.id)
      : [],
  ]);
  const chapterEmail = settings.replyToEmail?.trim() || null;

  const strings = dict.passenger.request;
  const page = strings.page;
  const detail = dict.passenger.rides.detail;
  const words = wordsLocale(language);
  const notation = resolveLocale(head.get("accept-language"));
  const chapter = request.chapter.name;
  const zone = request.chapter.timeZone;

  const headline = rideHeadline(
    {
      model: request.model,
      title: null,
      locationName: request.pickupName,
      destinationName: request.destinationName,
    },
    dict.calendar,
    {
      rideTo: dict.calendar.card.rideTo,
      rideFrom: dict.calendar.card.rideFrom,
      words,
    },
  );

  const start = request.pickupName?.trim() || request.pickupAddress?.trim();
  const startAddress =
    request.pickupName?.trim() && request.pickupAddress?.trim()
      ? request.pickupAddress
      : null;
  const pickupPlace = {
    name: request.pickupName,
    address: request.pickupAddress,
    latitude: request.pickupLatitude,
    longitude: request.pickupLongitude,
  };
  const map =
    Boolean(start) &&
    hasStaticMap(request.pickupLatitude, request.pickupLongitude);
  const functional = request.model === "functional";
  const destination = functional
    ? request.destinationName?.trim() || request.destinationAddress?.trim()
    : null;
  const riders = requestedRiders(request);
  const forSomeoneElse = request.passengers.some(
    ({ passenger }) => passenger.userId !== session.user.id,
  );

  return (
    <>
      <MemberTitle title={headline} />
      <PersonalHeader
        badge={
          <StatusBadge
            state={state}
            rideGone={rideGone}
            page={page}
            waiting={dict.member.rides.upcoming.requested}
            chapter={chapter}
            words={words}
          />
        }
        title={headline}
        startsAt={request.requestedStartsAt}
        endsAt={request.requestedEndsAt}
        timeZone={zone}
        locale={notation}
      >
        <p className="text-2sm text-ink-soft">
          {formatMessage(
            page.asked,
            {
              date: formatDate(calendarDate(request.createdAt, zone), notation),
            },
            words,
          )}
        </p>
      </PersonalHeader>

      <RequestState
        state={state}
        rideGone={rideGone}
        rideId={booked ? request.rideId : null}
        decisionNote={
          request.status === "declined" ? request.decisionNote : null
        }
        page={page}
        chapter={chapter}
        words={words}
      />

      {map && start ? (
        <OpenInMapsSheet
          place={pickupPlace}
          strings={dict.member.rides.map}
          words={words}
        >
          <StaticMap
            lat={request.pickupLatitude}
            lng={request.pickupLongitude}
            label={formatMessage(detail.mapOf, { place: start }, words)}
          />
        </OpenInMapsSheet>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-base">{detail.day}</h2>
        <ol className="flex flex-col">
          <TimelineStop
            kind="pickup"
            title={formatMessage(
              page.pickupBetween,
              {
                from: formatTime(request.requestedStartsAt, notation, zone),
                to: formatTime(request.requestedEndsAt, notation, zone),
              },
              words,
            )}
          >
            {start ? (
              <>
                <span>{start}</span>
                {startAddress ? (
                  <span className="text-2sm text-ink-soft">{startAddress}</span>
                ) : null}
                {map ? null : (
                  <OpenInMapsSheet
                    place={pickupPlace}
                    strings={dict.member.rides.map}
                    words={words}
                    className="w-fit"
                  >
                    <span className="text-2sm underline underline-offset-4">
                      {detail.openInMaps}
                    </span>
                  </OpenInMapsSheet>
                )}
              </>
            ) : (
              <span className="text-ink-soft">{detail.placeTbd}</span>
            )}
          </TimelineStop>
          {destination ? (
            <TimelineStop
              kind="arrive"
              title={formatMessage(detail.arriveAt, { destination }, words)}
            >
              {request.destinationName?.trim() &&
              request.destinationAddress?.trim() ? (
                <span className="text-2sm text-ink-soft">
                  {request.destinationAddress}
                </span>
              ) : null}
            </TimelineStop>
          ) : null}
          {functional && request.roundTrip ? (
            <TimelineStop
              kind="return"
              title={page.wayBack}
            >
              {state === "pending" ? (
                <span className="text-2sm text-ink-soft">
                  {formatMessage(page.wayBackHint, { chapter }, words)}
                </span>
              ) : null}
            </TimelineStop>
          ) : null}
        </ol>
      </section>

      {riders.length > 1 || forSomeoneElse ? (
        <DetailSection title={page.riders}>
          <ul className="flex flex-col gap-1.25">
            {riders.map((name, index) => (
              <li
                key={`${index}-${name}`}
                className="text-sm"
              >
                {name}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}

      {request.note ? (
        <DetailSection title={page.note}>
          <p className="text-sm break-words whitespace-pre-wrap">
            {request.note}
          </p>
        </DetailSection>
      ) : null}

      {state === "pending" ? (
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            variant="outline"
            className="min-h-12 flex-1 rounded-full border-line sm:flex-none sm:px-6"
          >
            <Link
              href={`/passenger/rides/new?fromRequest=${request.id}`}
              transitionTypes={["push"]}
            >
              <CalendarClock aria-hidden />
              {page.change}
            </Link>
          </Button>
          <WithdrawRequest
            requestId={request.id}
            labels={page.cancel}
            errors={{ ...dict.common.errors, ...strings.errors }}
          />
        </div>
      ) : !booked ? (
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            variant="outline"
            className="min-h-12 flex-1 rounded-full border-line sm:flex-none sm:px-6"
          >
            <Link
              href="/passenger/rides/new"
              transitionTypes={["push"]}
            >
              <CalendarPlus aria-hidden />
              {page.askAgain}
            </Link>
          </Button>
        </div>
      ) : null}

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <h2 className="text-base">{detail.help}</h2>
        <p className="text-sm text-ink-soft">
          {formatMessage(detail.contact, { chapter }, words)}
        </p>
        <ChapterPhones
          phones={adminPhones.filter(
            (phone) => phone.userId !== session.user.id,
          )}
          call={detail.call}
          words={words}
        />
        {chapterEmail ? (
          <ChapterMail
            email={chapterEmail}
            subject={formatMessage(
              detail.subject,
              {
                date: formatDateMedium(
                  calendarDate(request.requestedStartsAt, zone),
                  notation,
                ),
              },
              words,
            )}
            label={dict.passenger.rides.write}
          />
        ) : null}
      </section>
    </>
  );
}

function StatusBadge({
  state,
  rideGone,
  page,
  waiting,
  chapter,
  words,
}: {
  state: State;
  rideGone: boolean;
  page: PageStrings;
  waiting: string;
  chapter: string;
  words: Locale;
}) {
  if (state === "pending")
    return (
      <p className="flex items-center gap-2 text-2sm font-medium text-mint-ink">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full bg-mint motion-safe:animate-pulse"
        />
        {waiting}
      </p>
    );

  const positive = state === "scheduled" && !rideGone;
  return (
    <Badge
      className={
        positive
          ? "w-fit bg-mint-tint text-ink"
          : "w-fit bg-canvas-deeper text-ink"
      }
    >
      {formatMessage(page.statuses[state], { chapter }, words)}
    </Badge>
  );
}

function RequestState({
  state,
  rideGone,
  rideId,
  decisionNote,
  page,
  chapter,
  words,
}: {
  state: State;
  rideGone: boolean;
  rideId: string | null;
  decisionNote: string | null;
  page: PageStrings;
  chapter: string;
  words: Locale;
}) {
  const body = formatMessage(
    rideGone ? page.bodies.scheduledGone : page.bodies[state],
    { chapter },
    words,
  );

  if (state === "pending")
    return (
      <p
        role="status"
        className="rounded-2xl bg-mint-tint p-4 text-sm"
      >
        {body}
      </p>
    );

  if (rideId)
    return (
      <section
        role="status"
        className="flex flex-col gap-3 rounded-2xl bg-mint-tint p-4"
      >
        <p className="text-sm">{body}</p>
        <Button
          asChild
          variant="brand"
          className="min-h-11 w-full rounded-full px-6 sm:w-fit"
        >
          <Link
            href={`/passenger/rides/${rideId}`}
            transitionTypes={["push"]}
          >
            {page.seeRide}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </section>
    );

  return (
    <section
      role="status"
      className="flex flex-col gap-1.25 rounded-2xl bg-canvas-deep p-4"
    >
      <p className="text-sm">{body}</p>
      {decisionNote ? (
        <figure className="mt-2 flex flex-col gap-1.25 border-t border-line pt-3">
          <figcaption className="text-2sm text-ink-soft">
            {formatMessage(page.decisionNote, { chapter }, words)}
          </figcaption>
          <blockquote className="text-sm break-words whitespace-pre-wrap">
            {decisionNote}
          </blockquote>
        </figure>
      ) : null}
    </section>
  );
}
