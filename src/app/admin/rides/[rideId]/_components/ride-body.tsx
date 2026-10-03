import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Ban, Bike, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { rides, slotOf } from "@/features/rides";
import { parseRoles } from "@/lib/access";
import { requireChapterAdmin } from "@/lib/auth-guards";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import {
  formatDate,
  formatDateTime,
  formatShortDateWithWeekday,
  formatTime,
  resolveLocale,
  wordsLocale,
  type Locale as Notation,
} from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { BackLink, DetailSection } from "../../../_components/detail-page";
import { hrefWith } from "../../../_components/href-with";
import { HistoryMore, historyShown } from "../../../_components/history-more";
import { PROPERTY_BUTTON } from "../../../_components/properties";
import { SidePanel } from "../../../_components/side-panel";
import { RelativeTime } from "../../../_components/timeline";
import { readActiveScope, type AdminSearchParams } from "../../../active-scope";
import {
  ALLOCATION_OPEN,
  ALLOCATION_PARAM,
} from "../../_components/allocation-param";
import { RideDangerZone } from "./ride-danger-zone";
import { PilotNote, RideEditor } from "./ride-editor";
import { RideHistory } from "./ride-history";
import { RideNoteComposer } from "./ride-note-composer";
import { RidePilots } from "./ride-pilots";
import { RideRoster } from "./ride-roster";

const DETAIL_ONLY = { [ALLOCATION_PARAM]: null, history: null };

const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`.trim();

export async function RideBody({
  params,
  searchParams,
}: {
  params: Promise<{ rideId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ session, scopeQuery }, { rideId }, query] = await Promise.all([
    readActiveScope(searchParams, "rides"),
    params,
    searchParams,
  ]);

  const ride = await rides.getRideDetail(rideId);
  if (!ride) notFound();
  await requireChapterAdmin(ride.chapterId);

  const editable = ride.status === "scheduled";
  const [log, chapterPassengers, chapterMembers, dict, language, head] =
    await Promise.all([
      rides.listRideLog(ride.id),
      editable
        ? passengers.listPassengersOfChapters([ride.chapterId])
        : Promise.resolve([]),
      editable
        ? membership.listMembersOfChapters([ride.chapterId])
        : Promise.resolve([]),
      getDictionary(),
      getLocale(),
      headers(),
    ]);

  const notation = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const zone = ride.chapter.timeZone;
  const slot = slotOf(ride, zone);
  const detail = dict.rides.detail;
  const errors = dict.rides.errors;
  const models = dict.calendar.models;
  const statuses = dict.calendar.statuses;
  const pathname = `/admin/rides/${ride.id}`;
  const backHref = hrefWith("/admin/rides", query, DETAIL_ONLY);
  const shown = historyShown(query);

  const span = (window: { startsAt: Date; endsAt: Date }, at: Notation) =>
    `${formatTime(window.startsAt, at, zone)}–${formatTime(window.endsAt, at, zone)}`;

  const other = ride.returnLeg ?? ride.returnLegOf;
  const leg = other
    ? {
        kind: ride.returnLeg ? ("back" as const) : ("there" as const),
        href: hrefWith(`/admin/rides/${other.id}`, query, DETAIL_ONLY),
        label: [
          formatShortDateWithWeekday(slotOf(other, zone).date, notation),
          span(other, notation),
          other.status === "scheduled" ? null : statuses[other.status],
        ]
          .filter(Boolean)
          .join(" · "),
      }
    : null;

  const booked = new Set(ride.roster.map((entry) => entry.passenger.id));
  const pilots = ride.assignments.filter(
    (assignment) => assignment.role === "pilot",
  );
  const onRide = new Set(pilots.map((assignment) => assignment.user.id));

  const riderChoices = chapterPassengers
    .filter((passenger) => !booked.has(passenger.id))
    .map((passenger) => ({ id: passenger.id, name: fullName(passenger) }));
  const pilotChoices = chapterMembers
    .filter(
      (member) =>
        member.organizationId === ride.chapterId &&
        parseRoles(member.role).includes("pilot") &&
        !onRide.has(member.userId),
    )
    .map((member) => ({
      id: member.userId,
      name: member.user.name || member.user.email,
    }));

  const cancelledLabel = ride.cancellationReasonCode
    ? dict.rides.reasons[ride.cancellationReasonCode]
    : null;

  const deleteName = formatDate(slot.date, notation);
  const consequences = (
    [
      ["riders", ride.roster.length],
      ["pilots", ride.assignments.length],
      ["history", log.length],
    ] as const
  )
    .filter(([, count]) => count > 0)
    .map(([key, count]) =>
      formatMessage(dict.rides.delete[key], { count }, words),
    );

  const panels = (
    <>
      <SidePanel title={detail.trishaws}>
        {ride.trishaws.length > 0 ? (
          <ul className="grid gap-1">
            {ride.trishaws.map(({ trishaw }) => (
              <li key={trishaw.id}>
                <Link
                  href={`/admin/trishaws/${trishaw.id}${scopeQuery}`}
                  className="-mx-2 flex min-h-8 items-center gap-2 rounded-md px-2 text-2sm transition-colors hover:bg-canvas-deeper"
                >
                  <Bike
                    aria-hidden
                    className="size-3.5 shrink-0 text-ink-soft"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {trishaw.name}
                  </span>
                  {trishaw.status === "active" ? null : (
                    <Badge className="bg-paper font-normal text-ink">
                      {detail.notReady}
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-2sm text-ink-soft">{detail.noTrishaws}</p>
        )}
        {editable ? (
          <Button
            asChild
            variant="outline"
            className={PROPERTY_BUTTON}
          >
            <Link
              href={hrefWith(pathname, query, {
                [ALLOCATION_PARAM]: ALLOCATION_OPEN,
              })}
              scroll={false}
            >
              <Bike aria-hidden />
              {detail.changeTrishaws}
            </Link>
          </Button>
        ) : null}
      </SidePanel>

      <SidePanel title={detail.pilots}>
        <RidePilots
          rideId={ride.id}
          editable={editable}
          required={ride.requiredPilots}
          assigned={pilots.map(({ user }) => ({
            id: user.id,
            name: user.name || user.email,
            href: `/admin/members/${user.id}${scopeQuery}`,
            avatar: avatarSvg(avatarSeed(user.email)),
          }))}
          choices={pilotChoices}
          language={language}
          labels={{ ...detail, errors }}
        />
      </SidePanel>

      {ride.status === "completed" ? null : (
        <SidePanel title={detail.danger}>
          <RideDangerZone
            rideId={ride.id}
            status={ride.status}
            deleteName={deleteName}
            consequences={consequences}
            returnLeg={
              ride.returnLeg?.status === "scheduled"
                ? formatDateTime(ride.returnLeg.startsAt, notation, zone)
                : null
            }
            backHref={backHref}
            language={language}
            labels={{
              cancel: dict.rides.cancel,
              delete: dict.rides.delete,
              reasons: dict.rides.reasons,
              errors,
            }}
          />
        </SidePanel>
      )}
    </>
  );

  return (
    <>
      <BackLink
        href={backHref}
        label={detail.back}
      />

      <RideEditor
        ride={{
          id: ride.id,
          model: ride.model,
          status: ride.status,
          slot,
          requiredPilots: ride.requiredPilots,
          location: {
            name: ride.locationName,
            address: ride.locationAddress,
            latitude: ride.latitude,
            longitude: ride.longitude,
          },
          destination: {
            name: ride.destinationName,
            address: ride.destinationAddress,
            latitude: ride.destinationLatitude,
            longitude: ride.destinationLongitude,
          },
          leg,
        }}
        header={{
          title: formatMessage(
            detail.title,
            {
              model: models[ride.model],
              date: formatShortDateWithWeekday(slot.date, notation),
            },
            words,
          ),
          when: [formatDate(slot.date, notation), span(ride, notation)].join(
            " · ",
          ),
          chapter: ride.chapter.name,
          zone,
          zoneHint: formatMessage(
            detail.zoneHint,
            { zone: zone.replace(/_/g, " ") },
            words,
          ),
        }}
        editable={editable}
        language={language}
        notation={notation}
        labels={{
          detail,
          models,
          statuses,
          errors,
          field: {
            edit: detail.edit,
            saved: detail.saved,
            undo: detail.undo,
            undone: detail.undone,
            invalid: detail.invalid,
            errors,
          },
          status: { saving: detail.saving, saved: detail.savedAt },
        }}
        panels={panels}
      >
        {ride.status === "cancelled" ? (
          <section className="flex gap-3 rounded-xl bg-canvas-deep px-4 py-3 text-2sm">
            <Ban
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-ink-soft"
            />
            <div className="grid min-w-0 flex-1 gap-1">
              <p className="font-medium">
                {cancelledLabel
                  ? `${statuses.cancelled} · ${cancelledLabel}`
                  : statuses.cancelled}
              </p>
              <p className="text-ink-soft">
                {formatMessage(
                  detail.cancelledBy,
                  {
                    name: ride.cancelledBy?.name ?? dict.rides.history.someone,
                  },
                  words,
                )}
                {ride.cancelledAt ? (
                  <>
                    {" · "}
                    <RelativeTime
                      at={ride.cancelledAt}
                      notation={notation}
                      words={language}
                      now={new Date()}
                    />
                  </>
                ) : null}
              </p>
              {ride.cancellationNote ? (
                <p className="whitespace-pre-wrap break-words">
                  {ride.cancellationNote}
                </p>
              ) : null}
              <p className="text-ink-soft">{detail.readOnlyCancelled}</p>
            </div>
          </section>
        ) : ride.status === "completed" ? (
          <p className="flex gap-2 rounded-xl bg-mint-tint px-4 py-3 text-2sm">
            <Info
              aria-hidden
              className="mt-0.5 size-4 shrink-0"
            />
            {detail.readOnlyCompleted}
          </p>
        ) : null}

        <DetailSection
          title={detail.riders}
          description={formatMessage(
            detail.ridersCount,
            { count: ride.roster.length },
            words,
          )}
        >
          <RideRoster
            rideId={ride.id}
            editable={editable}
            riders={ride.roster.map((entry) => ({
              id: entry.passenger.id,
              name: fullName(entry.passenger),
            }))}
            choices={riderChoices}
            language={language}
            labels={{ ...detail, errors }}
          />
        </DetailSection>

        <DetailSection
          title={detail.noteForPilots}
          description={detail.noteForPilotsHint}
        >
          <PilotNote
            rideId={ride.id}
            note={ride.note}
            editable={editable}
            label={detail.noteForPilots}
            placeholder={detail.notePlaceholder}
            labels={{
              edit: detail.edit,
              saved: detail.saved,
              undo: detail.undo,
              undone: detail.undone,
              invalid: detail.invalid,
              errors,
            }}
          />
        </DetailSection>

        <DetailSection title={detail.history}>
          <RideNoteComposer
            rideId={ride.id}
            labels={{ ...dict.rides.history.composer, errors }}
          />
          <RideHistory
            entries={log.slice(0, shown)}
            viewerId={session.user.id}
            timeZone={zone}
            labels={dict.rides.history}
            models={models}
            reasons={dict.rides.reasons}
            empty={detail.historyEmpty}
            notation={notation}
            words={language}
          />
          <HistoryMore
            pathname={pathname}
            query={query}
            shown={shown}
            total={log.length}
            label={dict.admin.history.showMore}
          />
        </DetailSection>
      </RideEditor>
    </>
  );
}
