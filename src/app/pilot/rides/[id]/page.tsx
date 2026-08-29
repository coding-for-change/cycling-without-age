"use client";

/* Ride detail — the pilot's full logistics card (passenger, route, trishaw &
   garage, partner, roster) plus the one next action. Events open with their
   cover presentation first; the logistics live one tap away. */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import {
  eventTitle,
  eventBody,
  eventSeats,
  rosterNames,
} from "@/lib/selectors";
import type { Database, Ride } from "@/lib/types";
import { BackHead } from "@/components/chrome";
import {
  Avatar,
  AvatarStack,
  BatteryBar,
  BtnHero,
  StatusBadge,
  TypeBadge,
} from "@/components/bits";
import { EventCover, CoverChip, SeatStrip } from "@/components/events";
import { MapEmbed } from "@/components/MapEmbed";
import { Icon } from "@/components/Icon";
import { usePilot } from "../../pilot-context";
import { GrabButton } from "../../cards";
import { clientOf, partnerOf, isMine, needsPilot } from "../../lib";

export default function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const db = useStore((s) => s.db)!;
  const [showDetails, setShowDetails] = useState(false);

  const ride = find(db.rides, id);
  if (!ride) {
    return <BackHead back="/pilot/rides" />;
  }
  if (ride.type === "event" && !showDetails) {
    return (
      <EventScreen
        ride={ride}
        db={db}
        onDetails={() => setShowDetails(true)}
      />
    );
  }
  return (
    <RideScreen
      ride={ride}
      db={db}
      onEvent={ride.type === "event" ? () => setShowDetails(false) : undefined}
    />
  );
}

/* ---------------------------- event presentation ---------------------------- */
function EventScreen({
  ride,
  db,
  onDetails,
}: {
  ride: Ride;
  db: Database;
  onDetails: () => void;
}) {
  const { t, fmt } = useI18n();
  const { pilotId } = usePilot();
  const seats = eventSeats(ride);
  const partner = partnerOf(ride, db);
  const guests = rosterNames(ride.roster);
  let myTri;
  if (ride.pilots) {
    for (const k of Object.keys(ride.pilots))
      if (ride.pilots[k] === pilotId) myTri = find(db.trishaws, k);
  }

  return (
    <>
      <BackHead back="/pilot/rides" />
      <div className="app-body gap-6">
        <div className="reveal">
          <EventCover
            ride={ride}
            tall
            date={false}
            chips={
              <CoverChip
                label={t("common.event")}
                icon="sparkles"
              />
            }
          />
        </div>

        <div
          className="reveal flex flex-col gap-2"
          style={{ ["--i" as string]: 1 }}
        >
          <div className="display">{eventTitle(ride, db)}</div>
          <div className="flex flex-wrap items-center gap-3 muted">
            <span className="flex items-center gap-1.5">
              <Icon
                name="calendar"
                size={15}
              />
              {fmt.dateLong(ride.ts)}
            </span>
            <span className="flex items-center gap-1.5">
              <Icon
                name="clock"
                size={15}
              />
              {fmt.time(ride.ts)}
            </span>
          </div>
          {myTri && (
            <div>
              <span className="badge badge-mint">
                <Icon name="bike" />
                {t("pilot.event.youRide", { trishaw: myTri.number })}
              </span>
            </div>
          )}
        </div>

        <div
          className="tile-grid reveal"
          style={{ ["--i" as string]: 2 }}
        >
          <div className="tile tile-grey">
            <div className="tile-label">{t("common.duration")}</div>
            <div className="tile-value">
              {fmt.num(ride.durationMin)}
              <span style={{ fontSize: "1rem" }}> {t("common.min")}</span>
            </div>
            <div className="tile-glyph">
              <Icon name="clock" />
            </div>
          </div>
          <div className="tile tile-mint">
            <div className="tile-label">{t("common.seats")}</div>
            <div className="tile-value">
              {seats.taken}
              <span style={{ fontSize: "1rem" }}>/{seats.total}</span>
            </div>
            <div className="tile-glyph">
              <Icon name="armchair" />
            </div>
          </div>
        </div>

        {eventBody(ride) && (
          <div
            className="reveal flex flex-col gap-2"
            style={{ ["--i" as string]: 3 }}
          >
            <h2 className="h2">{t("common.about")}</h2>
            <p>{eventBody(ride)}</p>
          </div>
        )}

        <div
          className="reveal flex flex-col gap-2"
          style={{ ["--i" as string]: 4 }}
        >
          <h2 className="h2">{t("common.location")}</h2>
          <div className="font-semibold">{ride.location || ride.pickup}</div>
          <MapEmbed
            address={ride.location || ride.pickup}
            caption={false}
          />
          {partner && (
            <div className="flex items-center gap-2 text-sm muted">
              <Icon
                name="building"
                size={15}
              />
              {t("common.hostedBy", { name: partner.name })}
            </div>
          )}
        </div>

        {guests.length > 0 && (
          <div
            className="reveal flex flex-col gap-2"
            style={{ ["--i" as string]: 5 }}
          >
            <h2 className="h2">{t("common.whoIsComing")}</h2>
            <div className="flex items-center gap-3">
              <AvatarStack
                names={guests}
                max={5}
              />
              <span className="text-sm muted">
                {t("common.seatsFree", {
                  free: seats.free,
                  total: seats.total,
                })}
              </span>
            </div>
            <SeatStrip ride={ride} />
          </div>
        )}

        <div
          className="reveal flex flex-col gap-3"
          style={{ ["--i" as string]: 6 }}
        >
          <button
            type="button"
            className="btn btn-outline btn-lg btn-block"
            onClick={onDetails}
          >
            <Icon name="list" />
            {t("pilot.ride.title")}
          </button>
          {needsPilot(ride) && !isMine(ride, pilotId) && (
            <GrabButton ride={ride} />
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------ ride logistics ------------------------------ */
function RideScreen({
  ride,
  db,
  onEvent,
}: {
  ride: Ride;
  db: Database;
  onEvent?: () => void;
}) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const { pilotId } = usePilot();

  const client = clientOf(ride, db);
  const partner = partnerOf(ride, db);
  /* WhatsApp bookings can carry a proxy directly on the ride */
  const rideProxy = (
    ride as Ride & {
      proxy?: { name: string; relation?: string; phone?: string } | null;
    }
  ).proxy;
  const proxy = rideProxy || client?.proxy;
  let myTrishawId = ride.trishawId;
  if (ride.pilots) {
    for (const k of Object.keys(ride.pilots))
      if (ride.pilots[k] === pilotId) myTrishawId = k;
  }
  const tri = myTrishawId ? find(db.trishaws, myTrishawId) : undefined;
  const gar = tri ? find(db.garages, tri.garageId) : undefined;
  const chat = find(db.chats, `chat-${ride.id}`);
  const mine = isMine(ride, pilotId);
  const back =
    ride.status === "open" ? "/pilot/rides" : "/pilot/rides?tab=mine";

  const rosterTimes: string[] = [];
  (ride.roster || []).forEach((e) => {
    if (!rosterTimes.includes(e.time)) rosterTimes.push(e.time);
  });

  return (
    <>
      <BackHead
        back={back}
        title={t("pilot.ride.title")}
        onBack={onEvent}
      />
      <div className="app-body gap-6">
        <div className="reveal flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={ride.type} />
            <StatusBadge status={ride.status} />
            <span className="badge badge-outline">
              <Icon name="clock" />
              {fmt.rel(ride.ts)}
            </span>
          </div>
          <div className="display display-sm">{fmt.rideWhen(ride)}</div>
          {ride.type === "event" && (
            <div className="muted">{eventTitle(ride, db)}</div>
          )}
        </div>

        {/* passenger card */}
        {client && (
          <div
            className="card reveal flex flex-col gap-3"
            style={{ ["--i" as string]: 1 }}
          >
            <div className="eyebrow">{t("common.passenger")}</div>
            <div className="flex items-center gap-3.5">
              <Avatar
                name={client.name}
                size="lg"
              />
              <span className="min-w-0 flex-1">
                <span className="h2 block">
                  {client.name}
                  {client.age ? `, ${client.age}` : ""}
                </span>
                <span className="text-xs muted">{client.phone}</span>
              </span>
              <a
                className="icon-pill"
                href={`tel:${client.phone}`}
                aria-label={t("common.call")}
              >
                <Icon name="phone" />
              </a>
            </div>
            {client.mobilityNotes && (
              <div className="alert alert-grey">
                <Icon name="info" />
                <div>{client.mobilityNotes}</div>
              </div>
            )}
            {proxy && (
              <div className="flex items-center justify-between text-sm">
                <span className="muted">{t("pilot.ride.proxy")}</span>
                <a
                  className="font-semibold"
                  href={`tel:${proxy.phone || ""}`}
                >
                  {proxy.name}
                  {"relation" in proxy && proxy.relation ? (
                    <span className="muted"> ({proxy.relation})</span>
                  ) : null}
                </a>
              </div>
            )}
            {ride.notes && (
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="muted">{t("common.notes")}</span>
                <span className="text-right font-semibold">{ride.notes}</span>
              </div>
            )}
          </div>
        )}

        {/* route card */}
        <div
          className="card reveal flex flex-col gap-3"
          style={{ ["--i" as string]: 2 }}
        >
          <div className="eyebrow">{t("pilot.ride.route")}</div>
          <div className="flex items-start gap-2 text-sm">
            <Icon
              name="mapPin"
              size={16}
              className="mt-0.5"
            />
            <span>
              <span className="block text-xs muted">{t("common.pickup")}</span>
              <span className="font-semibold">{ride.pickup}</span>
            </span>
          </div>
          {(ride.stops || []).map((s) => (
            <div
              key={s}
              className="flex items-start gap-2 text-sm"
            >
              <Icon
                name="mapPin"
                size={16}
                className="mt-0.5"
              />
              <span>
                <span className="block text-xs muted">{t("common.stop")}</span>
                <span className="font-semibold">{s}</span>
              </span>
            </div>
          ))}
          {ride.destination && (
            <div className="flex items-start gap-2 text-sm">
              <Icon
                name="flag"
                size={16}
                className="mt-0.5"
              />
              <span>
                <span className="block text-xs muted">
                  {t("common.destination")}
                </span>
                <span className="font-semibold">{ride.destination}</span>
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm muted">
            <Icon
              name="clock"
              size={15}
            />
            {ride.durationMin} {t("common.min")}
            {ride.returnRide && (
              <span className="badge badge-grey">{t("common.return")}</span>
            )}
          </div>
          <MapEmbed
            address={ride.pickup}
            small
            caption={false}
          />
        </div>

        {/* trishaw & garage card */}
        {tri && (
          <div
            className="card reveal flex flex-col gap-3"
            style={{ ["--i" as string]: 3 }}
          >
            <div className="eyebrow">{t("pilot.ride.bike")}</div>
            {ride.pilots && mine && (
              <div>
                <span className="badge badge-mint">
                  <Icon name="bike" />
                  {t("pilot.event.youRide", { trishaw: tri.number })}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Icon
                  name="bike"
                  size={16}
                />
                <span className="font-bold">{tri.number}</span>
                <span className="text-sm muted">{tri.model}</span>
              </span>
              <BatteryBar pct={tri.battery} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="muted">{t("common.lockCode")}</span>
              <span className="rounded-lg bg-grey-tint px-2.5 py-1 font-display font-bold tracking-widest">
                {tri.lockCode}
              </span>
            </div>
            {gar && (
              <>
                <div className="flex items-start gap-2 text-sm">
                  <Icon
                    name="warehouse"
                    size={16}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-semibold">{gar.name}</span>
                    <span className="muted">{gar.address}</span>
                  </span>
                </div>
                {gar.accessInstructions && (
                  <div className="alert alert-mint">
                    <Icon name="key" />
                    <div>{gar.accessInstructions}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* partner contact */}
        {partner && (
          <div
            className="card reveal flex flex-col gap-2"
            style={{ ["--i" as string]: 4 }}
          >
            <div className="eyebrow">{t("pilot.ride.partner")}</div>
            <div className="flex items-center justify-between">
              <span>
                <span className="block font-semibold">
                  {partner.contactName}
                </span>
                <span className="text-sm muted">{partner.name}</span>
              </span>
              <a
                className="icon-pill"
                href={`tel:${partner.phone}`}
                aria-label={t("common.call")}
              >
                <Icon name="phone" />
              </a>
            </div>
          </div>
        )}

        {/* event roster (read-only) */}
        {ride.roster && ride.trishaws && (
          <div
            className="card reveal flex flex-col gap-3"
            style={{ ["--i" as string]: 5 }}
          >
            <div className="eyebrow">{t("pilot.ride.roster")}</div>
            <div className="overflow-x-auto">
              <div
                className="grid gap-1 text-sm"
                style={{
                  gridTemplateColumns: `auto repeat(${ride.trishaws.length}, 1fr)`,
                }}
              >
                <div />
                {ride.trishaws.map((tid) => {
                  const tw = find(db.trishaws, tid);
                  return (
                    <div
                      key={tid}
                      className="px-2 py-1 text-xs font-bold uppercase tracking-wide muted"
                    >
                      {tw ? tw.number : tid}
                    </div>
                  );
                })}
                {rosterTimes.map((time) => (
                  <RosterRow
                    key={time}
                    time={time}
                    ride={ride}
                  />
                ))}
              </div>
            </div>
            {onEvent && (
              <button
                type="button"
                className="btn btn-outline btn-block"
                onClick={onEvent}
              >
                <Icon name="sparkles" />
                {t("common.event")}
              </button>
            )}
          </div>
        )}

        {/* actions */}
        <div
          className="reveal flex flex-col gap-3"
          style={{ ["--i" as string]: 6 }}
        >
          {(chat || (ride.status === "staffed" && ride.clientId)) && (
            <button
              type="button"
              className="btn btn-outline btn-lg btn-block"
              onClick={() => router.push(`/pilot/chats/${ride.id}`)}
            >
              <Icon name="chat" />
              {t("common.chat")}
            </button>
          )}
          {ride.status === "open" && needsPilot(ride) && !mine && (
            <GrabButton ride={ride} />
          )}
          {ride.status === "staffed" && mine && (
            <BtnHero
              label={t("pilot.checkin")}
              icon="check"
              onClick={() => router.push(`/pilot/rides/${ride.id}/checkin`)}
            />
          )}
          {ride.status === "in_progress" && mine && (
            <BtnHero
              label={t("pilot.finish")}
              icon="checkCheck"
              onClick={() => router.push(`/pilot/rides/${ride.id}/debrief`)}
            />
          )}
        </div>
      </div>
    </>
  );
}

function RosterRow({ time, ride }: { time: string; ride: Ride }) {
  return (
    <>
      <div className="px-2 py-1.5 font-display font-bold">{time}</div>
      {(ride.trishaws || []).map((tid) => {
        const entry = (ride.roster || []).find(
          (e) => e.time === time && e.trishawId === tid,
        );
        return entry?.name ? (
          <div
            key={tid}
            className="flex items-center gap-1.5 rounded-lg bg-mint-tint px-2 py-1.5"
          >
            {entry.order != null && (
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white text-[0.6875rem] font-bold">
                {entry.order}
              </span>
            )}
            <span className="truncate">{entry.name}</span>
          </div>
        ) : (
          <div
            key={tid}
            className="rounded-lg bg-grey-tint px-2 py-1.5 text-center muted"
          >
            –
          </div>
        );
      })}
    </>
  );
}
