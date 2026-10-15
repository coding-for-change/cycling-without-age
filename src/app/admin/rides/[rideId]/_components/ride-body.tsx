import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Ban } from "lucide-react";
import { membership } from "@/features/membership";
import { passengers, pickupLabel, pickupOf } from "@/features/passengers";
import { modelLimits, rides, slotOf } from "@/features/rides";
import { addRideNoteAction } from "@/features/rides/actions";
import {
  isPilot,
  toPassengerChoice,
  toPersonChoice,
  toPilotChoice,
} from "@/features/rides/components/crew-choices";
import { ridePilots } from "@/features/rides/components/ride-presentation";
import {
  rideDetailStrings,
  rideErrors,
  rideHistoryStrings,
} from "@/features/rides/components/strings";
import { trishawOptions } from "@/features/rides/components/trishaw-options";
import { RIDE_NOTE_MAX } from "@/features/rides/schemas";
import { requireChapterAdmin } from "@/lib/auth-guards";
import { trishawChoicesForRide } from "@/use-cases/schedule-ride";
import {
  formatDate,
  formatDateTime,
  formatShortDateWithWeekday,
  formatTimeRange,
  resolveLocale,
  wordsLocale,
  type Locale as Notation,
} from "@/lib/format";
import type { Coords } from "@/lib/geo";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cyclingRoute } from "@/lib/mapbox";
import { pick } from "@/lib/utils";
import { markdownToolLabels } from "@/components/markdown-editor";
import {
  BackLink,
  DetailNotice,
  DetailSection,
} from "../../../_components/detail-page";
import { deletionConsequences } from "../../../_components/deletion-consequences";
import { fieldLabels } from "../../../_components/field-labels";
import { hrefWith } from "@/lib/search-params";
import { historyShown } from "../../../_components/history-more";
import { HistorySection } from "../../../_components/history-section";
import { NoteComposer } from "../../../_components/note-composer";
import { RelativeTime } from "../../../_components/timeline";
import { readActiveScope, type AdminSearchParams } from "../../../active-scope";
import { PILOT_LABELS, ROSTER_LABELS, TRISHAW_LABELS } from "./panel-labels";
import { PilotNote, RideEditor } from "./ride-editor";
import { RideEventContent } from "./ride-event-content";
import { RideHistory } from "./ride-history";
import { RidePilots } from "./ride-pilots";
import { RideRoster } from "./ride-roster";
import { RideTrash } from "./ride-trash";
import { RideTrishaws } from "./ride-trishaws";

const DETAIL_ONLY = { history: null };

async function cachedRoute(from: Coords, to: Coords) {
  "use cache";
  cacheLife("days");
  const route = await cyclingRoute(from, to);
  if (!route) throw new Error("route unavailable");
  return route;
}

const routeBetween = (from: Coords, to: Coords) =>
  cachedRoute(from, to).catch(() => null);

export async function RideBody({
  params,
  searchParams,
}: {
  params: Promise<{ rideId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ session, scopeQuery }, ride, query, dict, language, head] =
    await Promise.all([
      readActiveScope(searchParams, "rides"),
      params.then(({ rideId }) => rides.getRideDetail(rideId)),
      searchParams,
      getDictionary(),
      getLocale(),
      headers(),
    ]);
  if (!ride) notFound();
  await requireChapterAdmin(ride.chapterId);

  const editable = ride.status === "scheduled";
  const shown = historyShown(query);
  const [log, logTotal, chapterPassengers, chapterMembers, allocation] =
    await Promise.all([
      rides.listRideLog(ride.id, shown),
      rides.countRideLog(ride.id),
      editable
        ? passengers.listPassengersOfChapters([ride.chapterId])
        : Promise.resolve([]),
      editable
        ? membership.listMembersOfChapters([ride.chapterId])
        : Promise.resolve([]),
      editable ? trishawChoicesForRide(ride) : Promise.resolve(null),
    ]);

  const notation = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const zone = ride.chapter.timeZone;
  const slot = slotOf(ride, zone);
  const detail = rideDetailStrings(dict);
  const errors = rideErrors(dict);
  const models = dict.calendar.models;
  const statuses = dict.calendar.statuses;
  const pathname = `/admin/rides/${ride.id}`;
  const backHref = hrefWith("/admin/rides", query, DETAIL_ONLY);

  const span = (window: { startsAt: Date; endsAt: Date }, at: Notation) =>
    formatTimeRange(window.startsAt, window.endsAt, at, zone);

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
  const pilots = ridePilots(ride);
  const onRide = new Set(pilots.map((assignment) => assignment.user.id));

  const riderChoices = chapterPassengers
    .filter((passenger) => !booked.has(passenger.id))
    .map((passenger) =>
      toPassengerChoice(passenger, dict.calendar.pickupCareHome),
    );
  const limits = modelLimits(ride.model, ride.capacity, ride.requiredPilots);
  const pilotChoices = chapterMembers
    .filter((member) => isPilot(member) && !onRide.has(member.userId))
    .map(toPilotChoice);
  const people = {
    search: dict.rides.people.search,
    empty: dict.rides.people.empty,
  };
  const pleasure = ride.model === "pleasure";
  const trishawChoices = allocation
    ? trishawOptions(
        allocation,
        new Set(ride.trishaws.map(({ trishaw }) => trishaw.id)),
        dict,
        words,
      )
    : [];

  const route =
    ride.model === "functional" &&
    ride.latitude !== null &&
    ride.longitude !== null &&
    ride.destinationLatitude !== null &&
    ride.destinationLongitude !== null
      ? routeBetween(
          { lat: ride.latitude, lng: ride.longitude },
          { lat: ride.destinationLatitude, lng: ride.destinationLongitude },
        )
      : null;

  const cancelledLabel = ride.cancellationReasonCode
    ? dict.rides.reasons[ride.cancellationReasonCode]
    : null;

  const deleteName = formatDate(slot.date, notation);
  const consequences = deletionConsequences(
    {
      riders: ride.roster.length,
      pilots: ride.assignments.length,
      history: logTotal,
    },
    dict.admin.deletion,
    language,
  );
  const otherWhen = other
    ? { when: formatDateTime(other.startsAt, notation, zone) }
    : null;
  if (other?.status === "cancelled" && otherWhen)
    consequences.push(
      formatMessage(
        ride.returnLeg ? dict.rides.delete.wayBack : dict.rides.delete.wayThere,
        otherWhen,
        words,
      ),
    );
  const deleteBlocked =
    other?.status === "scheduled" && otherWhen
      ? formatMessage(
          ride.returnLeg
            ? dict.rides.delete.blockedWayBack
            : dict.rides.delete.blockedWayThere,
          otherWhen,
          words,
        )
      : null;

  const field = fieldLabels(detail, errors);

  const panels = (
    <>
      <RideTrishaws
        rideId={ride.id}
        editable={editable}
        allocated={ride.trishaws.map(({ trishaw }) => ({
          id: trishaw.id,
          name: trishaw.name,
          href: `/admin/trishaws/${trishaw.id}${scopeQuery}`,
          notReady: trishaw.status !== "active",
        }))}
        options={trishawChoices}
        limit={limits.trishaws}
        language={language}
        labels={{
          ...pick(detail, TRISHAW_LABELS),
          search: dict.fleet.allocation.search,
          noMatch: dict.fleet.allocation.noMatch,
          errors: { ...dict.fleet.common.errors, ...errors },
        }}
      />

      <RidePilots
        rideId={ride.id}
        editable={editable}
        assigned={pilots.map(({ user }) => ({
          ...toPersonChoice(user),
          href: `/admin/members/${user.id}${scopeQuery}`,
        }))}
        required={ride.requiredPilots}
        limit={limits.pilots}
        choices={pilotChoices}
        language={language}
        labels={{
          ...pick(detail, PILOT_LABELS),
          full: pleasure ? detail.onePilot : errors.pilotsFull,
          errors,
        }}
        pick={people}
      />
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
          title: ride.title,
          capacity: ride.capacity,
          riders: ride.roster.length,
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
          home:
            ride.chapter.latitude === null || ride.chapter.longitude === null
              ? null
              : {
                  name: ride.chapter.name,
                  address: ride.chapter.address,
                  latitude: ride.chapter.latitude,
                  longitude: ride.chapter.longitude,
                },
          leg,
          movesReturnLeg: ride.returnLeg?.status === "scheduled",
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
          cover: ride.photos[0]?.fileId ?? null,
        }}
        editable={editable}
        language={language}
        notation={notation}
        labels={{
          detail,
          models,
          statuses,
          errors,
          field,
          status: { saving: detail.saving, saved: detail.savedAt },
          makeEvent: { ...detail.makeEvent, errors },
          makeFunctional: {
            ...detail.makeFunctional,
            place: detail.place,
            errors,
          },
        }}
        route={route}
        trash={
          ride.status === "scheduled" || ride.status === "cancelled" ? (
            <RideTrash
              key="trash"
              rideId={ride.id}
              status={ride.status}
              deleteName={deleteName}
              consequences={consequences}
              deleteBlocked={deleteBlocked}
              returnLeg={
                ride.returnLeg?.status === "scheduled"
                  ? formatDateTime(ride.returnLeg.startsAt, notation, zone)
                  : null
              }
              backHref={backHref}
              language={language}
              labels={{
                cancel: dict.rides.cancel,
                delete: {
                  ...dict.rides.delete,
                  consequences: dict.admin.deletion.consequences,
                },
                reasons: dict.rides.reasons,
                errors,
              }}
            />
          ) : null
        }
        panels={panels}
      >
        {ride.status === "cancelled" ? (
          <DetailNotice
            icon={Ban}
            tone="muted"
          >
            <p className="font-medium">
              {cancelledLabel
                ? `${statuses.cancelled} · ${cancelledLabel}`
                : statuses.cancelled}
            </p>
            <p className="text-ink-soft">
              {formatMessage(
                detail.cancelledBy,
                {
                  name: ride.cancelledBy?.name ?? dict.admin.history.someone,
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
          </DetailNotice>
        ) : ride.status === "completed" ? (
          <DetailNotice>{detail.readOnlyCompleted}</DetailNotice>
        ) : null}

        {ride.model === "event" ? (
          <RideEventContent
            rideId={ride.id}
            description={ride.description}
            photos={ride.photos.map((photo) => photo.fileId)}
            editable={editable}
            language={language}
            labels={{
              description: detail.description,
              placeholder: detail.descriptionPlaceholder,
              photos: detail.photos,
              field,
              markdown: markdownToolLabels(dict),
              gallery: { ...dict.common.gallery, errors },
            }}
          />
        ) : null}

        <RideRoster
          rideId={ride.id}
          editable={editable}
          riders={ride.roster.map(({ passenger }) => ({
            ...toPassengerChoice(passenger),
            href: passenger.userId
              ? `/admin/members/${passenger.userId}${scopeQuery}`
              : null,
            pickup: pickupLabel(
              pickupOf(passenger),
              dict.calendar.pickupCareHome,
            ),
          }))}
          choices={riderChoices}
          limit={limits.passengers}
          language={language}
          labels={{
            ...pick(detail, ROSTER_LABELS),
            pickupLabel: dict.calendar.pickupLabel,
            errors,
          }}
          pick={{
            search: people.search,
            empty: riderChoices.length ? people.empty : detail.addRiderEmpty,
          }}
        />

        <DetailSection
          title={detail.noteForPilots}
          description={detail.noteForPilotsHint}
        >
          <PilotNote
            rideId={ride.id}
            value={ride.note}
            editable={editable}
            label={detail.noteForPilots}
            placeholder={detail.notePlaceholder}
            labels={field}
          />
        </DetailSection>

        <HistorySection
          title={detail.history}
          composer={
            <NoteComposer
              action={addRideNoteAction}
              input={{ rideId: ride.id }}
              maxLength={RIDE_NOTE_MAX}
              labels={{ ...dict.rides.history.composer, errors }}
            />
          }
          pathname={pathname}
          query={query}
          shown={shown}
          total={logTotal}
          showMoreLabel={dict.admin.history.showMore}
        >
          <RideHistory
            entries={log}
            viewerId={session.user.id}
            timeZone={zone}
            labels={rideHistoryStrings(dict)}
            models={models}
            reasons={dict.rides.reasons}
            empty={detail.historyEmpty}
            notation={notation}
            words={language}
          />
        </HistorySection>
      </RideEditor>
    </>
  );
}
