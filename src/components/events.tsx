"use client";

/* The shared event vocabulary: cover art with date tab + chips, event cards,
   seat strips. Used by passenger, pilot and admin alike. */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Scene } from "@/lib/art";
import { eventArt, eventSeats, eventTitle } from "@/lib/selectors";
import type { Database, Ride } from "@/lib/types";
import { Icon } from "./Icon";

/** Cover art block with the date tab and optional status chips. */
export function EventCover({
  ride,
  tall,
  date = true,
  chips,
}: {
  ride: Ride;
  tall?: boolean;
  date?: boolean;
  chips?: ReactNode;
}) {
  const { fmt } = useI18n();
  const d = new Date(ride.ts);
  return (
    <div className={cn("cover", tall && "cover-tall")}>
      <Scene name={eventArt(ride)} />
      {chips && <div className="cover-chips">{chips}</div>}
      {date && (
        <div className="cover-date">
          <div className="d">{d.getDate()}</div>
          <div className="m">{fmt.monthShort(ride.ts)}</div>
        </div>
      )}
    </div>
  );
}

export function CoverChip({
  label,
  icon,
  tone,
}: {
  label: string;
  icon?: string;
  tone?: "ink" | "red";
}) {
  return (
    <span className={cn("cover-chip", tone && `on-${tone}`)}>
      {icon && <Icon name={icon} />}
      {label}
    </span>
  );
}

/** Seat strip: one square per roster slot. */
export function SeatStrip({ ride, myName }: { ride: Ride; myName?: string }) {
  return (
    <div className="seats">
      {(ride.roster || []).map((s, i) => {
        const mine = !!s.name && !!myName && s.name === myName;
        return (
          <span
            key={i}
            className={cn("seat", mine ? "mine" : s.name && "taken")}
          >
            <Icon name={s.name ? "user" : "armchair"} />
          </span>
        );
      })}
    </div>
  );
}

/** Compact event card for rails and lists. */
export function EventCard({
  ride,
  db,
  onOpen,
  myName,
  chips,
  foot,
}: {
  ride: Ride;
  db: Database;
  onOpen: () => void;
  myName?: string;
  chips?: ReactNode;
  foot?: ReactNode;
}) {
  const { t, fmt } = useI18n();
  const seats = eventSeats(ride);
  const mine = !!myName && (ride.roster || []).some((s) => s.name === myName);

  return (
    <button
      type="button"
      className="event-card"
      onClick={onOpen}
    >
      <EventCover
        ride={ride}
        chips={
          chips ??
          (mine ? (
            <CoverChip
              label={t("common.reserved")}
              icon="check"
              tone="ink"
            />
          ) : seats.free > 0 ? (
            <CoverChip
              label={t("common.seatsFree", {
                free: seats.free,
                total: seats.total,
              })}
              icon="armchair"
            />
          ) : (
            <CoverChip label={t("common.full")} />
          ))
        }
      />
      <div className="event-card-body">
        <div className="h2">{eventTitle(ride, db)}</div>
        <div className="flex items-center gap-1.5 text-sm muted">
          <Icon
            name="calendar"
            size={14}
          />{" "}
          {fmt.dayTime(ride.ts)}
        </div>
        <div className="flex items-center gap-1.5 text-sm muted">
          <Icon
            name="mapPin"
            size={14}
          />
          <span className="truncate">{ride.location || ride.pickup}</span>
        </div>
        {foot}
      </div>
    </button>
  );
}
