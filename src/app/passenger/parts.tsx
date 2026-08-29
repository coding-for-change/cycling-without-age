"use client";

/* Shared passenger pieces: wizard dots, big options, event cards + seat
   actions, the notifications sheet, the cancel-ride dialog, the timeline. */

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, notify, find } from "@/lib/store";
import { toast } from "@/lib/ui";
import { isActiveRide, eventTitle, eventSeats } from "@/lib/selectors";
import type { Client, Database, Ride } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { BellButton } from "@/components/chrome";
import { EventCover, CoverChip } from "@/components/events";
import { usePassenger } from "./session";

export function Dots({ step, total }: { step: number; total: number }) {
  return (
    <div className="progress-dots">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={i + 1 < step ? "done" : i + 1 === step ? "current" : ""}
        />
      ))}
    </div>
  );
}

export function BigOpt({
  icon,
  tone = "on-grey",
  title,
  hint,
  selected,
  onClick,
}: {
  icon: string;
  tone?: string;
  title: string;
  hint?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`big-option${selected ? " selected" : ""}`}
      onClick={onClick}
    >
      <span className={`icon-tile ${tone}`}>
        <Icon name={icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block">{title}</span>
        {hint && <span className="hint block">{hint}</span>}
      </span>
      {selected && <Icon name="check" />}
    </button>
  );
}

export function Chip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`chip${active ? " active" : ""}`}
      onClick={onClick}
    >
      {icon && <Icon name={icon} />}
      {label}
    </button>
  );
}

/* ---- events ---- */

export function myEvents(db: Database, client: Client | undefined): Ride[] {
  return db.rides
    .filter(
      (r) =>
        r.type === "event" &&
        isActiveRide(r) &&
        r.ts > Date.now() &&
        (r.public === true ||
          (!!client?.partnerId && r.partnerId === client.partnerId)),
    )
    .sort((a, b) => a.ts - b.ts);
}

export function onList(r: Ride, name: string): boolean {
  return (r.roster || []).some((x) => x.name === name);
}

/** Compact event card used on the home rail and the events list. */
export function PaxEventCard({ ride, db }: { ride: Ride; db: Database }) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const session = usePassenger();
  const seats = eventSeats(ride);
  const mine = onList(ride, session.name);
  return (
    <button
      type="button"
      className="event-card"
      onClick={() => router.push(`/passenger/events/${ride.id}`)}
    >
      <EventCover
        ride={ride}
        chips={
          mine ? (
            <CoverChip
              label={t("pax.onList")}
              icon="check"
              tone="ink"
            />
          ) : seats.free ? (
            <CoverChip
              label={t("pax.seatsFree", {
                free: seats.free,
                total: seats.total,
              })}
              icon="armchair"
            />
          ) : (
            <CoverChip
              label={t("pax.eventFull")}
              icon="x"
            />
          )
        }
      />
      <div className="event-card-body">
        <div className="h2">{eventTitle(ride, db)}</div>
        <div className="flex items-center gap-1.5 text-sm muted">
          <Icon
            name="clock"
            size={15}
          />
          <span className="truncate">
            {fmt.day(ride.ts)} · {fmt.time(ride.ts)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm muted">
          <Icon
            name="mapPin"
            size={15}
          />
          <span className="truncate">{ride.pickup}</span>
        </div>
      </div>
    </button>
  );
}

/** Reserve the first free roster slot for me. */
export function useSeatActions() {
  const { t } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const session = usePassenger();

  return {
    reserveSeat(id: string) {
      const title = eventTitle(find(db.rides, id)!, db);
      update((d) => {
        const r = find(d.rides, id);
        if (!r || !r.roster) return;
        const free = r.roster.find((x) => !x.name);
        if (!free) return;
        const maxOrder = r.roster.reduce(
          (m, x) => Math.max(m, x.order || 0),
          0,
        );
        free.name = session.name;
        free.order = maxOrder + 1;
        notify(
          d,
          "admin",
          "notif.eventSignup",
          { name: session.name, event: title },
          `/admin/rides/${id}`,
        );
      });
      toast(t("pax.reservedToast"), "success");
    },
    cancelSeat(id: string) {
      const title = eventTitle(find(db.rides, id)!, db);
      update((d) => {
        const r = find(d.rides, id);
        if (!r || !r.roster) return;
        const mineSlot = r.roster.find((x) => x.name === session.name);
        if (!mineSlot) return;
        mineSlot.name = null;
        mineSlot.order = null;
        notify(
          d,
          "admin",
          "notif.eventCancel",
          { name: session.name, event: title },
          `/admin/rides/${id}`,
        );
      });
      toast(t("pax.seatCancelledToast"), "info");
    },
  };
}

/* ---- notifications sheet ---- */

const NOTIF_ICON: Record<string, string> = {
  "notif.pilotAssigned": "bike",
  "notif.scheduled": "calendar",
  "notif.cancelled": "x",
  "notif.message": "chat",
};

export function PaxBell() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const session = usePassenger();
  const [open, setOpen] = useState(false);
  const [mountedAt] = useState(() => Date.now());

  const mine = db.notifications
    .filter((n) => n.audience === `client:${session.userId}`)
    .slice()
    .sort((a, b) => b.ts - a.ts);
  const fresh = mine.some((n) => n.ts > mountedAt - 864e5);

  return (
    <>
      <BellButton
        hasNew={fresh}
        onClick={() => setOpen(true)}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="h2">{t("common.notifications")}</div>
            <button
              type="button"
              className="icon-pill"
              aria-label={t("common.close")}
              onClick={() => setOpen(false)}
            >
              <Icon name="x" />
            </button>
          </div>
          {mine.length ? (
            <div className="flex flex-col gap-2.5">
              {mine.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="record-card flex items-center gap-3.5"
                  onClick={() => {
                    setOpen(false);
                    if (n.hash) router.push(n.hash);
                  }}
                >
                  <span className="icon-tile icon-tile-sm on-mint">
                    <Icon name={NOTIF_ICON[n.tKey] || "bell"} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {t(`${n.tKey}.t`, n.params)}
                    </span>
                    <span className="block truncate text-xs muted">
                      {t(`${n.tKey}.b`, n.params)}
                    </span>
                  </span>
                  <span className="text-xs muted">{fmt.rel(n.ts)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="icon-tile">
                <Icon name="bell" />
              </span>
              <div>{t("pax.notif.empty")}</div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

/* ---- cancel-ride dialog ---- */

export function CancelRideDialog({
  rideId,
  open,
  onClose,
  onCancelled,
}: {
  rideId: string;
  open: boolean;
  onClose: () => void;
  onCancelled?: () => void;
}) {
  const { t, fmt } = useI18n();
  const update = useStore((s) => s.update);
  const session = usePassenger();
  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        <div className="display display-sm">{t("pax.cancelQ")}</div>
        <button
          type="button"
          className="btn btn-primary btn-xl btn-block"
          onClick={() => {
            update((d) => {
              const r = find(d.rides, rideId);
              if (!r) return;
              r.status = "cancelled";
              const when = fmt.rideWhen(r);
              notify(
                d,
                "admin",
                "notif.cancelled",
                { name: session.name, when },
                `/admin/rides/${rideId}`,
              );
              if (r.pilotId)
                notify(
                  d,
                  "pilot",
                  "notif.cancelled",
                  { name: session.name, when },
                  `/pilot/rides/${rideId}`,
                );
            });
            onClose();
            toast(t("pax.cancelledToast"), "info");
            onCancelled?.();
          }}
        >
          {t("pax.cancelYes")}
        </button>
        <button
          type="button"
          className="btn btn-outline btn-xl btn-block"
          onClick={onClose}
        >
          {t("pax.cancelKeep")}
        </button>
      </div>
    </Modal>
  );
}

/* ---- ride timeline (booked → pilot → ride day → done) ---- */

export function Timeline({ ride }: { ride: Ride }) {
  const { t, fmt } = useI18n();
  const idx =
    (
      { requested: 1, open: 1, staffed: 2, in_progress: 2, done: 4 } as Record<
        string,
        number
      >
    )[ride.status] ?? 1;
  const steps: { key: string; hint?: string | null }[] = [
    { key: "pax.tlBooked" },
    {
      key: "pax.tlPilot",
      hint:
        ride.status === "requested"
          ? t("pax.requestedText")
          : ride.status === "open"
            ? t("pax.lookingPilot")
            : null,
    },
    { key: "pax.tlDay", hint: idx === 2 ? fmt.rideWhen(ride) : null },
    { key: "pax.tlDone" },
  ];
  return (
    <div className="flex flex-col">
      {steps.map((st, i) => {
        const state = i < idx ? "done" : i === idx ? "current" : "pending";
        return (
          <div
            key={st.key}
            className="flex gap-3.5 pb-4 last:pb-0"
          >
            <span
              className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 text-white"
              style={{
                borderColor:
                  state === "pending"
                    ? "var(--line)"
                    : state === "done"
                      ? "var(--mint)"
                      : "var(--ink)",
                background:
                  state === "done"
                    ? "var(--mint)"
                    : state === "current"
                      ? "var(--ink)"
                      : "transparent",
              }}
            >
              {state === "done" && (
                <Icon
                  name="check"
                  size={13}
                  className="text-black"
                />
              )}
              {state === "current" && (
                <span className="h-2 w-2 rounded-full bg-white" />
              )}
            </span>
            <span className="min-w-0">
              <span
                className={`block ${state === "pending" ? "muted" : "font-semibold"}`}
              >
                {t(st.key)}
              </span>
              {st.hint && state !== "pending" && (
                <span className="hint block">{st.hint}</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function NotFoundState({ msg, cta }: { msg: string; cta?: ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <div className="app-body">
      <div className="empty-state">
        <span className="icon-tile">
          <Icon name="search" />
        </span>
        <div>{msg}</div>
        {cta ?? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => router.push("/passenger")}
          >
            {t("pax.backHome")}
          </button>
        )}
      </div>
    </div>
  );
}
