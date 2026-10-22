import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowRight,
  Bike,
  Flag,
  MessageCircle,
  Phone,
  StickyNote,
} from "lucide-react";
import { RichText } from "@/components/markdown";
import { PersonAvatar } from "@/components/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { chapters } from "@/features/chapters";
import { chat } from "@/features/chat";
import { membership } from "@/features/membership";
import { pickupLabel, pickupOf } from "@/features/passengers";
import { rides, type PilotRideDetailRow } from "@/features/rides";
import { CheckInList } from "@/features/rides/components/check-in-list";
import { OpenInMapsSheet } from "@/features/rides/components/open-in-maps-sheet";
import { rideHeadline } from "@/features/rides/components/ride-presentation";
import { StaticMap } from "@/features/rides/components/static-map";
import { hasStaticMap } from "@/features/rides/components/static-map-url";
import {
  checkInStrings,
  walkUpStrings,
} from "@/features/rides/components/strings";
import { WalkUpDrawer } from "@/features/rides/components/walk-up-drawer";
import { requirePerspective } from "@/lib/auth-guards";
import { avatarSvg } from "@/lib/avatar";
import { calendarDate, sameDay } from "@/lib/calendar";
import {
  formatDateMedium,
  formatRelativeTime,
  formatShortDateWithWeekday,
  formatTime,
  resolveLocale,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn, fullName } from "@/lib/utils";
import { pickupView } from "@/use-cases/finish-ride";
import { ChapterMail } from "../../../../_components/chapter-mail";
import { ChapterPhones } from "../../../../_components/chapter-phones";
import { MemberTitle } from "../../../../_components/member-title";
import {
  personFaces,
  userFaces,
  type PersonFace,
} from "../../../../_components/person-faces";
import { DetailSection } from "../../../../_components/ride-detail/detail-section";
import { EventHeader } from "../../../../_components/ride-detail/event-header";
import { EventHero } from "../../../../_components/ride-detail/event-hero";
import { PersonalHeader } from "../../../../_components/ride-detail/personal-header";
import { PlaceCard } from "../../../../_components/ride-detail/place-card";
import { TimelineStop } from "../../../../_components/ride-detail/timeline-stop";
import { pilotChapterIds } from "../../_components/open-rides";
import { OpenRide } from "./open-ride";
import { PickupCard } from "./pickup-card";
import { WithdrawButton } from "./withdraw-button";

type Leg = NonNullable<PilotRideDetailRow["returnLeg"]>;
type Strings = Dictionary["pilot"]["rides"]["detail"];

export async function PilotRide({
  params,
}: {
  params: Promise<{ rideId: string }>;
}) {
  const [{ rideId }, session] = await Promise.all([
    params,
    requirePerspective("pilot"),
  ]);
  const userId = session.user.id;
  const [ride, dict, language, head] = await Promise.all([
    rides.getRideForPilot(rideId, userId),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  if (!ride)
    return (
      <OpenRide
        rideId={rideId}
        userId={userId}
        pilotChapterIds={pilotChapterIds(session.access)}
        dict={dict}
        locale={locale}
        words={words}
      />
    );

  const now = new Date();
  const otherLeg = ride.returnLeg ?? ride.returnLegOf;
  const crew = ride.assignments.filter(
    (assignment) => assignment.user.id !== userId,
  );
  const ahead = ride.status === "scheduled" && ride.startsAt > now;
  const [
    otherLegOpen,
    settings,
    chatId,
    running,
    pickup,
    crewFaces,
    riders,
    adminPhones,
  ] = await Promise.all([
    otherLeg ? rides.pilotCanOpen(otherLeg.id, userId) : false,
    chapters.getSettings(ride.chapterId),
    chat.getRideConversationId(ride.id, userId),
    rides.pilotCanRun(ride.id, userId),
    pickupView(ride, now),
    userFaces(
      session,
      crew.map(({ user }) => ({ id: user.id, name: user.name })),
    ),
    riderFaces(session, ride.roster),
    ahead ? membership.listChapterAdminPhones(ride.chapterId) : [],
  ]);
  const mayWithdraw =
    ahead &&
    now <
      rides.withdrawalClosesAt(ride.startsAt, settings.staffingCheckLeadHours);
  const strings = dict.pilot.rides.detail;
  const zone = ride.chapter.timeZone;
  const cancelled = ride.status === "cancelled";
  const completed = ride.status === "completed";
  const event = ride.model === "event";
  const canFinish = running && rides.isFinishable(ride, now);
  const doorOpen = running && rides.checkInOpen(ride, "pilot", now);
  const headline = event
    ? ride.title?.trim() || dict.calendar.models.event
    : rideHeadline(ride, dict.calendar, {
        rideTo: dict.calendar.card.rideTo,
        rideFrom: dict.calendar.card.rideFrom,
        words,
      });
  const relative =
    !cancelled && ride.endsAt > now
      ? ` · ${formatRelativeTime(ride.startsAt, words, now)}`
      : null;
  const startPlace = {
    name: ride.locationName,
    address: ride.locationAddress,
    latitude: ride.latitude,
    longitude: ride.longitude,
  };
  const chapterEmail = settings.replyToEmail?.trim() || null;
  const faceOf = new Map(riders.map((face) => [face.id, face]));

  const ridersSection =
    doorOpen || completed ? (
      <DetailSection
        title={doorOpen ? dict.rides.execution.checkIn : strings.riders}
        hint={doorOpen ? dict.rides.execution.checkInHint : null}
      >
        <CheckInList
          rideId={ride.id}
          entries={ride.roster.map((entry) => ({
            id: entry.id,
            name: entry.passenger
              ? fullName(entry.passenger)
              : (entry.guestName ?? ""),
            walkUp: !entry.passenger,
            attendance: entry.attendance,
            pickup: entry.passenger
              ? pickupLine(entry.passenger, dict, words)
              : null,
            phone: entry.passenger
              ? (entry.passenger.user?.phoneNumber ??
                entry.passenger.managedBy.phoneNumber)
              : null,
            via:
              entry.passenger && !entry.passenger.user?.phoneNumber
                ? entry.passenger.managedBy.name
                : null,
            avatar: avatarOf(faceOf.get(entry.id), entry.id),
          }))}
          open={doorOpen}
          language={language}
          labels={checkInStrings(dict, {
            call: strings.call,
            via: strings.via,
          })}
        />
        {doorOpen ? (
          <WalkUpDrawer
            rideId={ride.id}
            language={language}
            labels={walkUpStrings(dict)}
            triggerClassName="w-full sm:w-fit"
          />
        ) : null}
      </DetailSection>
    ) : (
      <DetailSection title={strings.riders}>
        {ride.roster.length > 0 ? (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {ride.roster.map(({ id, passenger, guestName }) => {
              const avatar = avatarOf(faceOf.get(id), id);
              return (
                <li
                  key={id}
                  className="flex min-h-14 items-center gap-3 px-4 py-3"
                >
                  <PersonAvatar
                    svg={avatar.svg}
                    photoUrl={avatar.photoUrl}
                    size="lg"
                  />
                  {passenger ? (
                    <RiderContact
                      name={fullName(passenger)}
                      pickup={pickupLine(passenger, dict, words)}
                      phone={
                        passenger.user?.phoneNumber ??
                        passenger.managedBy.phoneNumber
                      }
                      via={
                        passenger.user?.phoneNumber
                          ? null
                          : passenger.managedBy.name
                      }
                      strings={strings}
                      words={words}
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {guestName}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <Muted>{strings.noRiders}</Muted>
        )}
      </DetailSection>
    );

  return (
    <>
      <MemberTitle title={headline} />
      {event ? (
        <>
          <EventHero
            rideId={ride.id}
            title={headline}
            photos={ride.photos}
          />
          <EventHeader
            eyebrow={ride.chapter.name}
            title={headline}
            startsAt={ride.startsAt}
            endsAt={ride.endsAt}
            timeZone={zone}
            locale={locale}
            after={relative}
          />
        </>
      ) : (
        <PersonalHeader
          badge={
            cancelled || completed ? (
              <Badge
                className={cn(
                  "w-fit",
                  cancelled
                    ? "bg-canvas-deeper text-ink"
                    : "bg-mint-tint text-ink",
                )}
              >
                {dict.calendar.statuses[ride.status]}
              </Badge>
            ) : null
          }
          title={headline}
          startsAt={ride.startsAt}
          endsAt={ride.endsAt}
          timeZone={zone}
          locale={locale}
          after={relative}
        >
          <p className="text-2sm text-ink-soft">
            {[dict.calendar.models[ride.model], ride.chapter.name].join(" · ")}
          </p>
        </PersonalHeader>
      )}

      {doorOpen ? ridersSection : null}

      <PilotRideState
        ride={ride}
        strings={strings}
        reasons={dict.rides.reasons}
      />

      {canFinish ? (
        <Link
          href={`/pilot/rides/${ride.id}/finish`}
          transitionTypes={["push"]}
          className="flex items-center gap-4 rounded-2xl border border-mint bg-mint-tint p-4 transition-colors hover:bg-mint motion-reduce:transition-none"
        >
          <Flag
            aria-hidden
            className="size-5 shrink-0 text-ink"
          />
          <span className="min-w-0">
            <span className="block font-medium">{dict.fleet.finish.title}</span>
            <span className="block text-sm text-ink-soft">
              {dict.fleet.finish.homeCard.body}
            </span>
          </span>
          <ArrowRight
            aria-hidden
            className="ml-auto size-4 shrink-0 text-ink-soft"
          />
        </Link>
      ) : null}

      {event ? (
        <PlaceCard
          place={startPlace}
          mapOf={dict.passenger.rides.detail.mapOf}
          strings={dict.member.rides.map}
          words={words}
        />
      ) : null}

      {event && ride.description?.trim() ? (
        <RichText
          text={ride.description}
          className="text-base"
        />
      ) : null}

      {ride.note?.trim() ? (
        <section
          aria-label={strings.note}
          className="flex items-start gap-3 rounded-2xl bg-mint-tint p-4"
        >
          <StickyNote
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-ink"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-2sm font-medium">{strings.note}</p>
            <RichText
              text={ride.note}
              className="text-sm"
            />
          </div>
        </section>
      ) : null}

      <RideDay
        ride={ride}
        event={event}
        otherLeg={otherLeg && otherLegOpen ? otherLeg : null}
        dict={dict}
        locale={locale}
        words={words}
      />

      {pickup && running ? (
        <PickupCard
          places={pickup}
          dict={dict}
          words={words}
        />
      ) : null}

      {doorOpen ? null : ridersSection}

      <DetailSection title={strings.crew}>
        {crewFaces.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {crewFaces.map((face) => (
              <CrewRow
                key={face.id}
                face={face}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">{strings.solo}</p>
        )}
        {chatId ? (
          <div className="flex flex-col gap-1.25">
            <Button
              asChild
              variant="outline"
              className="min-h-11 w-full rounded-full border-line sm:w-fit"
            >
              <Link
                href={`/pilot/chat/${chatId}`}
                transitionTypes={["push"]}
              >
                <MessageCircle aria-hidden />
                {strings.chat}
              </Link>
            </Button>
            <p className="text-2sm text-ink-soft">{strings.chatHint}</p>
          </div>
        ) : null}
      </DetailSection>

      <DetailSection title={strings.trishaws}>
        {ride.trishaws.length > 0 ? (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {ride.trishaws.map(({ trishaw }) => (
              <li
                key={trishaw.id}
                className="flex min-h-12 items-center gap-3 px-4 py-3"
              >
                <Bike
                  aria-hidden
                  className="size-4 shrink-0 text-ink-soft"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{trishaw.name}</span>
                  {trishaw.type ? (
                    <span className="truncate text-2sm text-ink-soft">
                      {trishaw.type.name}
                    </span>
                  ) : null}
                </span>
                {trishaw.status !== "active" ? (
                  <Badge
                    variant="outline"
                    className="ml-auto border-line text-ink-soft"
                  >
                    {dict.calendar.trishawStatuses[trishaw.status]}
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <Muted>{strings.noTrishaws}</Muted>
        )}
      </DetailSection>

      {!event && ride.description?.trim() ? (
        <DetailSection title={strings.about}>
          <RichText
            text={ride.description}
            className="text-sm"
          />
        </DetailSection>
      ) : null}

      {ahead ? (
        <DetailSection title={strings.cantMake.title}>
          <p className="text-sm text-ink-soft">
            {mayWithdraw
              ? strings.cantMake.body
              : formatMessage(
                  strings.withdrawClosed,
                  {
                    hours: settings.staffingCheckLeadHours,
                    chapter: ride.chapter.name,
                  },
                  words,
                )}
          </p>
          {mayWithdraw ? (
            <WithdrawButton
              rideId={ride.id}
              labels={{
                ...strings.withdraw,
                body:
                  otherLegOpen && otherLeg?.status === "scheduled"
                    ? strings.withdraw.bodyBoth
                    : strings.withdraw.body,
              }}
              errors={{ ...dict.common.errors, ...dict.pilot.rides.errors }}
            />
          ) : (
            <>
              <ChapterPhones
                phones={adminPhones.filter((phone) => phone.userId !== userId)}
                call={strings.call}
                words={words}
              />
              {chapterEmail ? (
                <ChapterMail
                  email={chapterEmail}
                  subject={formatMessage(
                    strings.cantMake.subject,
                    {
                      date: formatDateMedium(
                        calendarDate(ride.startsAt, zone),
                        locale,
                      ),
                    },
                    words,
                  )}
                  label={formatMessage(
                    strings.cantMake.write,
                    { chapter: ride.chapter.name },
                    words,
                  )}
                />
              ) : null}
            </>
          )}
        </DetailSection>
      ) : null}
    </>
  );
}

async function riderFaces(
  viewer: Parameters<typeof personFaces>[0],
  roster: PilotRideDetailRow["roster"],
) {
  return personFaces(
    viewer,
    roster.flatMap(({ id, passenger }) =>
      passenger
        ? [
            {
              id,
              name: fullName(passenger),
              ref: passenger.userId
                ? { kind: "user" as const, id: passenger.userId }
                : { kind: "passenger" as const, id: passenger.id },
            },
          ]
        : [],
    ),
  );
}

const avatarOf = (face: PersonFace | undefined, entryId: string) =>
  face
    ? { svg: face.svg, photoUrl: face.photoUrl }
    : { svg: avatarSvg(`guest:${entryId}`), photoUrl: null };

function PilotRideState({
  ride,
  strings,
  reasons,
}: {
  ride: PilotRideDetailRow;
  strings: Strings;
  reasons: Dictionary["rides"]["reasons"];
}) {
  if (ride.status === "cancelled")
    return (
      <section
        role="status"
        className="flex flex-col gap-1.25 rounded-2xl bg-canvas-deep p-4"
      >
        <h2 className="text-base">{strings.cancelled}</h2>
        <p className="text-sm">
          {ride.cancellationReasonCode
            ? reasons[ride.cancellationReasonCode]
            : strings.cancelledBody}
        </p>
      </section>
    );

  if (ride.status === "completed")
    return (
      <p className="rounded-2xl bg-mint-tint p-4 text-sm">
        {strings.completed}
      </p>
    );

  return null;
}

function RideDay({
  ride,
  event,
  otherLeg,
  dict,
  locale,
  words,
}: {
  ride: PilotRideDetailRow;
  event: boolean;
  otherLeg: Leg | null;
  dict: Dictionary;
  locale: Locale;
  words: Locale;
}) {
  if (event && !otherLeg) return null;
  const detail = dict.passenger.rides.detail;
  const strings = dict.pilot.rides.detail;
  const zone = ride.chapter.timeZone;
  const start = ride.locationName?.trim() || ride.locationAddress?.trim();
  const startAddress =
    ride.locationName?.trim() && ride.locationAddress?.trim()
      ? ride.locationAddress
      : null;
  const startPlace = {
    name: ride.locationName,
    address: ride.locationAddress,
    latitude: ride.latitude,
    longitude: ride.longitude,
  };
  const map = Boolean(start) && hasStaticMap(ride.latitude, ride.longitude);
  const destination =
    ride.model === "functional"
      ? ride.destinationName?.trim() || ride.destinationAddress?.trim()
      : null;
  const destinationPlace = {
    name: ride.destinationName,
    address: ride.destinationAddress,
    latitude: ride.destinationLatitude,
    longitude: ride.destinationLongitude,
  };
  const mapsLink = (place: typeof startPlace) => (
    <OpenInMapsSheet
      place={place}
      strings={dict.member.rides.map}
      words={words}
      className="w-fit"
    >
      <span className="text-2sm underline underline-offset-4">
        {detail.openInMaps}
      </span>
    </OpenInMapsSheet>
  );

  return (
    <>
      {!event && map && start ? (
        <OpenInMapsSheet
          place={startPlace}
          strings={dict.member.rides.map}
          words={words}
        >
          <StaticMap
            lat={ride.latitude}
            lng={ride.longitude}
            label={formatMessage(detail.mapOf, { place: start }, words)}
          />
        </OpenInMapsSheet>
      ) : null}
      <section className="flex flex-col gap-4">
        <h2 className="text-base">{strings.day}</h2>
        <ol className="flex flex-col">
          {event ? null : (
            <TimelineStop
              kind="pickup"
              title={formatMessage(
                detail.pickupAt,
                { time: formatTime(ride.startsAt, locale, zone) },
                words,
              )}
            >
              {start ? (
                <>
                  <span>{start}</span>
                  {startAddress ? (
                    <span className="text-2sm text-ink-soft">
                      {startAddress}
                    </span>
                  ) : null}
                  {map ? null : mapsLink(startPlace)}
                </>
              ) : (
                <span className="text-ink-soft">{strings.noPlace}</span>
              )}
            </TimelineStop>
          )}
          {destination ? (
            <TimelineStop
              kind="arrive"
              title={formatMessage(detail.arriveAt, { destination }, words)}
            >
              {ride.destinationName?.trim() &&
              ride.destinationAddress?.trim() ? (
                <span className="text-2sm text-ink-soft">
                  {ride.destinationAddress}
                </span>
              ) : null}
              {mapsLink(destinationPlace)}
            </TimelineStop>
          ) : null}
          {otherLeg ? (
            <TimelineStop
              kind={ride.returnLeg ? "return" : "pickup"}
              title={formatMessage(
                ride.returnLeg ? detail.returnAt : detail.wayThereAt,
                { time: formatTime(otherLeg.startsAt, locale, zone) },
                words,
              )}
              href={`/pilot/rides/${otherLeg.id}`}
            >
              {sameDay(otherLeg.startsAt, ride.startsAt, zone) &&
              otherLeg.status !== "cancelled" ? null : (
                <span className="text-2sm text-ink-soft">
                  {[
                    sameDay(otherLeg.startsAt, ride.startsAt, zone)
                      ? null
                      : formatShortDateWithWeekday(
                          calendarDate(otherLeg.startsAt, zone),
                          locale,
                        ),
                    otherLeg.status === "cancelled"
                      ? dict.calendar.statuses.cancelled
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </TimelineStop>
          ) : null}
        </ol>
      </section>
    </>
  );
}

function CrewRow({ face }: { face: PersonFace }) {
  return (
    <li className="flex items-center gap-3">
      <PersonAvatar
        svg={face.svg}
        photoUrl={face.photoUrl}
        size="lg"
      />
      <div className="flex min-w-0 flex-col">
        <p className="truncate font-medium">{face.name}</p>
        {face.bio ? (
          <p className="line-clamp-2 text-2sm text-ink-soft">{face.bio}</p>
        ) : null}
      </div>
    </li>
  );
}

function RiderContact({
  name,
  pickup,
  phone,
  via,
  strings,
  words,
}: {
  name: string;
  pickup: string | null;
  phone: string | null;
  via: string | null;
  strings: Strings;
  words: Locale;
}) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{name}</span>
        {pickup ? (
          <span className="truncate text-2sm text-ink-soft">{pickup}</span>
        ) : null}
        {phone && via ? (
          <span className="truncate text-2sm text-ink-soft">
            {formatMessage(strings.via, { name: via }, words)}
          </span>
        ) : null}
      </span>
      {phone ? (
        <a
          href={`tel:${phone.replace(/[^\d+]/g, "")}`}
          aria-label={formatMessage(strings.call, { name }, words)}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.25 rounded-full border border-line px-3 text-2sm tabular-nums transition-colors hover:bg-canvas-deep motion-reduce:transition-none"
        >
          <Phone
            aria-hidden
            className="size-4"
          />
          {phone}
        </a>
      ) : null}
    </>
  );
}

function pickupLine(
  passenger: Parameters<typeof pickupOf>[0],
  dict: Dictionary,
  words: Locale,
) {
  const place = pickupLabel(pickupOf(passenger), dict.calendar.pickupCareHome);
  return place
    ? formatMessage(dict.calendar.pickupLabel, { place }, words)
    : null;
}

function Muted({ children }: { children: string }) {
  return (
    <p className="rounded-2xl border border-line p-4 text-2sm text-ink-soft">
      {children}
    </p>
  );
}
