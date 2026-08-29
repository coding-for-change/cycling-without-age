"use client";

/* Ride cards shared by the pilot home + rides feed. */

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import type { Database, Ride } from "@/lib/types";
import { eventTitle, eventSeats } from "@/lib/selectors";
import { Icon } from "@/components/Icon";
import { Avatar, BtnHero, TypeBadge, StatusBadge } from "@/components/bits";
import { EventCover, CoverChip } from "@/components/events";
import { usePilot, useGrab } from "./pilot-context";
import {
  cleared,
  clientOf,
  partnerOf,
  freeTrishaw,
  isMine,
  needsPilot,
  rideName,
  ridersText,
  firstName,
} from "./lib";

export function GrabButton({ ride }: { ride: Ride }) {
  const { t } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const { pilotId } = usePilot();
  const grab = useGrab();

  if (!cleared(db, pilotId)) {
    return (
      <button
        type="button"
        className="btn btn-secondary btn-lg btn-block"
        onClick={() => router.push("/pilot/training")}
      >
        <Icon name="lock" />
        {t("pilot.gate.grab")}
      </button>
    );
  }
  return (
    <BtnHero
      tone="ink"
      label={t("pilot.feed.grab")}
      icon="bike"
      onClick={() => grab(ride.id)}
    />
  );
}

/** An open ride, presented as a proposition rather than a database row. */
export function OpenCard({
  ride,
  db,
  urgent,
}: {
  ride: Ride;
  db: Database;
  urgent?: boolean;
}) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const partner = partnerOf(ride, db);
  const client = clientOf(ride, db);

  let head, meta;
  if (ride.type === "event") {
    const freeId = freeTrishaw(ride);
    const tri = freeId ? find(db.trishaws, freeId) : undefined;
    head = (
      <>
        <div className="h2">{eventTitle(ride, db)}</div>
        <div className="text-sm font-bold">
          {t("pilot.event.needs", { trishaw: tri ? tri.number : "" })}
        </div>
      </>
    );
    meta = (
      <>
        <div className="flex items-center gap-2">
          <Icon
            name="clock"
            size={15}
          />
          {fmt.rideWhen(ride)} · {ride.durationMin} {t("common.min")}
        </div>
        <div className="flex items-center gap-2">
          <Icon
            name="mapPin"
            size={15}
          />
          <span className="truncate">{ride.pickup}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon
            name="users"
            size={15}
          />
          {t("pilot.event.slots", { n: (ride.roster || []).length })}
        </div>
      </>
    );
  } else {
    head = (
      <>
        <div className="h2">{fmt.rideWhen(ride)}</div>
        <div className="text-sm font-semibold muted">
          {client
            ? firstName(client.name) + (client.age ? `, ${client.age}` : "")
            : partner
              ? partner.name
              : ""}
        </div>
      </>
    );
    meta = (
      <>
        <div className="flex items-center gap-2">
          <Icon
            name="mapPin"
            size={15}
          />
          <span className="truncate">{ride.pickup}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon
            name="clock"
            size={15}
          />
          {ride.durationMin} {t("common.min")} · {ridersText(ride.riders)}
        </div>
      </>
    );
  }

  return (
    <div
      className="card flex flex-col gap-3.5"
      style={
        urgent
          ? { borderColor: "var(--red)", boxShadow: "0 0 0 1px var(--red)" }
          : undefined
      }
    >
      <div className="flex items-center justify-between">
        <TypeBadge type={ride.type} />
        <span className={`badge ${urgent ? "badge-red" : "badge-outline"}`}>
          <Icon name="clock" />
          {fmt.rel(ride.ts)}
        </span>
      </div>
      <div>{head}</div>
      <div className="flex flex-col gap-1.5 text-sm muted">{meta}</div>
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => router.push(`/pilot/rides/${ride.id}`)}
      >
        {t("common.details")}
      </button>
      <GrabButton ride={ride} />
    </div>
  );
}

/** One of my rides — always shows the single next action. */
export function MineCard({ ride, db }: { ride: Ride; db: Database }) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const action =
    ride.status === "staffed" ? (
      <span className="badge badge-deep">
        <Icon name="check" />
        {t("pilot.checkin")}
      </span>
    ) : ride.status === "in_progress" ? (
      <span className="badge badge-solid-mint">
        <Icon name="navigation" />
        {t("pilot.finish")}
      </span>
    ) : (
      <StatusBadge status={ride.status} />
    );

  return (
    <button
      type="button"
      className="link-card"
      onClick={() => router.push(`/pilot/rides/${ride.id}`)}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2">
          <TypeBadge type={ride.type} />
          {action}
        </span>
        <span className="h2">{fmt.rideWhen(ride)}</span>
        <span className="flex items-center gap-2 text-sm muted">
          <Icon
            name="user"
            size={15}
          />
          <span className="truncate">{rideName(ride, db)}</span>
        </span>
      </span>
      <Icon
        name="chevronRight"
        className="muted"
      />
    </button>
  );
}

export function PilotEventCard({ ride, db }: { ride: Ride; db: Database }) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const { pilotId } = usePilot();
  const seats = eventSeats(ride);
  const mine = isMine(ride, pilotId);
  return (
    <button
      type="button"
      className="event-card"
      onClick={() => router.push(`/pilot/rides/${ride.id}`)}
    >
      <EventCover
        ride={ride}
        chips={
          mine ? (
            <CoverChip
              label={t("common.pilot")}
              icon="shield"
              tone="ink"
            />
          ) : needsPilot(ride) ? (
            <CoverChip
              label={t("pilot.openTitle")}
              icon="alert"
              tone="red"
            />
          ) : (
            <CoverChip
              label={t("common.seatsFree", {
                free: seats.free,
                total: seats.total,
              })}
              icon="armchair"
            />
          )
        }
      />
      <div className="event-card-body">
        <div className="h2">{eventTitle(ride, db)}</div>
        <div className="flex items-center gap-2 text-sm muted">
          <Icon
            name="clock"
            size={15}
          />
          <span className="truncate">
            {fmt.day(ride.ts)} · {fmt.time(ride.ts)}
          </span>
        </div>
      </div>
    </button>
  );
}

/** Community quote — a story from a passenger or family member. */
export function StoryCard({ db }: { db: Database }) {
  const { t } = useI18n();
  const list = (db.stories || []).filter((s) => s.role !== "pilot");
  if (!list.length) return null;
  const s = list[new Date().getDate() % list.length];
  return (
    <div className="quote flex flex-col gap-2">
      <div className="quote-mark">“</div>
      <div className="quote-text">{t(s.tKey)}</div>
      <div className="flex items-center gap-3">
        <Avatar name={s.author} />
        <div>
          <div className="text-sm font-semibold">{s.author}</div>
          <div className="text-xs opacity-70">{t(`story.${s.role}`)}</div>
        </div>
      </div>
    </div>
  );
}
