"use client";

/* Ride detail (lifecycle timeline, logistics, debrief, chat) — and the event
   variant with per-trishaw pilot assignment and the roster grid. */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { toast } from "@/lib/ui";
import type { Ride } from "@/lib/types";
import { Avatar, StatusBadge, TypeBadge, BatteryBar } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/chrome";
import { Modal } from "@/components/Modal";
import { MapEmbed } from "@/components/MapEmbed";
import { cn } from "@/lib/utils";
import {
  AssignPilotModal,
  CancelRideModal,
  AdminChat,
  myPilots,
  rideWho,
} from "../../parts";

export default function AdminRideDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useStore((s) => s.db)!;
  const r = find(db.rides, id);
  const { t } = useI18n();
  const router = useRouter();

  if (!r) {
    return (
      <>
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => router.push("/admin/rides")}
          >
            <Icon name="arrowLeft" />
            {t("common.back")}
          </button>
        </div>
        <div className="card">
          <EmptyState
            icon="search"
            text={t("admin.nav.rides")}
          />
        </div>
      </>
    );
  }

  return r.type === "event" ? <EventDetail r={r} /> : <RideDetail r={r} />;
}

/* ---------------- 1:1 ride ---------------- */
function RideDetail({ r }: { r: Ride }) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const [assign, setAssign] = useState(false);
  const [cancel, setCancel] = useState(false);

  const who = rideWho(db, r);
  const p = find(db.pilots, r.pilotId);
  const tw = find(db.trishaws, r.trishawId);
  const g = tw ? find(db.garages, tw.garageId) : undefined;

  /* lifecycle timeline */
  const order: Record<string, number> = {
    requested: 0,
    open: 1,
    staffed: 2,
    in_progress: 3,
    done: 4,
  };
  const idx = r.status === "cancelled" ? 0 : order[r.status];
  const steps = [
    {
      k: "admin.tl.requested",
      done: true,
      current: false,
      hint: fmt.date(r.createdAt),
    },
    {
      k: "admin.tl.scheduled",
      done: idx >= 1,
      current: idx === 0,
      hint: idx >= 1 ? fmt.rideWhen(r) : "",
    },
    {
      k: "admin.tl.pilot",
      done: idx >= 2,
      current: idx === 1,
      hint: p?.name || "",
    },
    {
      k: "admin.tl.ride",
      done: idx >= 4,
      current: idx === 3,
      hint: fmt.dayTime(r.ts),
    },
    { k: "admin.tl.done", done: idx >= 4, current: false, hint: "" },
  ];

  const rows: [string, React.ReactNode][] = [];
  rows.push([t("admin.col.when"), fmt.rideWhen(r)]);
  rows.push([t("common.pickup"), r.pickup]);
  if (r.stops?.length) rows.push([t("common.stop"), r.stops.join(", ")]);
  if (r.destination) rows.push([t("common.destination"), r.destination]);
  rows.push([t("common.return"), t(r.returnRide ? "common.yes" : "common.no")]);
  if (tw) rows.push([t("common.trishaw"), tw.number]);
  if (g) rows.push([t("common.garage"), g.name]);
  rows.push([t("common.passengers"), r.riders]);
  rows.push([t("admin.col.source"), t(`admin.src.${r.source || "admin"}`)]);
  if (r.notes) rows.push([t("common.notes"), r.notes]);

  return (
    <>
      <div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => router.push("/admin/rides")}
        >
          <Icon name="arrowLeft" />
          {t("common.back")}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <Avatar
            name={who}
            size="lg"
          />
          <div>
            <h1 className="h1">{who}</h1>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <TypeBadge type={r.type} />
              <StatusBadge status={r.status} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {r.status === "open" && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setAssign(true)}
            >
              <Icon name="user" />
              {t("admin.att.assign")}
            </button>
          )}
          {r.status !== "done" && r.status !== "cancelled" && (
            <button
              type="button"
              className="btn btn-destructive-outline"
              onClick={() => setCancel(true)}
            >
              <Icon name="x" />
              {t("admin.ride.cancel")}
            </button>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="flex flex-col gap-4">
          <div className="card">
            <h3 className="h2 mb-4">{t("admin.ride.lifecycle")}</h3>
            <div className="timeline">
              {steps.map((s) => (
                <div
                  key={s.k}
                  className={cn(
                    "timeline-step",
                    s.done ? "done" : s.current ? "current" : "pending",
                  )}
                >
                  <div className="timeline-dot">
                    {s.done && <Icon name="check" />}
                  </div>
                  <div>
                    <div className="timeline-title">{t(s.k)}</div>
                    {s.hint && <div className="hint">{s.hint}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="h2 mb-4">{t("common.details")}</h3>
            <div className="detail-list">
              {rows.map(([k, v], i) => (
                <div key={i}>
                  <dt className="muted">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <MapEmbed
                address={r.pickup}
                small
              />
            </div>
          </div>
          {r.status === "done" && r.debrief && (
            <div className="card">
              <h3 className="h2 mb-4">{t("admin.ride.debrief")}</h3>
              <div className="detail-list">
                <div>
                  <dt className="muted">{t("admin.ride.bike")}</dt>
                  <dd className="font-semibold">
                    {r.debrief.bikeOk
                      ? t("admin.ride.bikeOk")
                      : t("admin.ride.issue")}
                  </dd>
                </div>
                <div>
                  <dt className="muted">{t("admin.ride.batteryReturn")}</dt>
                  <dd>
                    <BatteryBar pct={r.debrief.batteryReturn} />
                  </dd>
                </div>
                <div>
                  <dt className="muted">{t("common.donation")}</dt>
                  <dd>{fmt.euro(r.debrief.donation || 0)}</dd>
                </div>
                {r.debrief.feedback && (
                  <div>
                    <dt className="muted">{t("admin.ride.feedback")}</dt>
                    <dd className="text-right">{r.debrief.feedback}</dd>
                  </div>
                )}
              </div>
              {!r.debrief.bikeOk && r.debrief.issue && (
                <div className="alert alert-red mt-4">
                  <Icon name="wrench" />
                  <div>{r.debrief.issue}</div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="h2">{t("common.chat")}</h3>
          <AdminChat rideId={r.id} />
        </div>
      </div>

      {assign && (
        <AssignPilotModal
          rideId={r.id}
          onClose={() => setAssign(false)}
        />
      )}
      {cancel && (
        <CancelRideModal
          rideId={r.id}
          onClose={() => setCancel(false)}
        />
      )}
    </>
  );
}

/* ---------------- event ---------------- */
const RESIDENTS = [
  "Georg Lang",
  "Anni Roth",
  "Rosa Eder",
  "Franz Obermeier",
  "Liesl Huber",
];

function EventDetail({ r }: { r: Ride }) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const [cancel, setCancel] = useState(false);
  const [rosterSlot, setRosterSlot] = useState<{
    time: string;
    twId: string;
  } | null>(null);

  const pn = find(db.partners, r.partnerId);
  const who = rideWho(db, r);
  const assignable = myPilots(db).filter((p) => p.trained);
  const twKeys = Object.keys(r.pilots || {});
  const twIds = r.trishaws || twKeys;
  const times: string[] = [];
  (r.roster || []).forEach((x) => {
    if (!times.includes(x.time)) times.push(x.time);
  });

  const filled = (r.roster || []).filter((x) => x.name).length;
  const total = (r.roster || []).length;
  const isFull = total > 0 && filled === total;

  return (
    <>
      <div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => router.push("/admin/events")}
        >
          <Icon name="arrowLeft" />
          {t("common.back")}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <Avatar
            name={who}
            size="lg"
          />
          <div>
            <h1 className="h1">{who}</h1>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <TypeBadge type="event" />
              <StatusBadge status={r.status} />
              {r.public && (
                <span className="badge badge-grey">{t("admin.ev.public")}</span>
              )}
            </div>
          </div>
        </div>
        {r.status !== "done" && r.status !== "cancelled" && (
          <button
            type="button"
            className="btn btn-destructive-outline"
            onClick={() => setCancel(true)}
          >
            <Icon name="x" />
            {t("admin.ride.cancel")}
          </button>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="h2 mb-4">{t("common.details")}</h3>
          <div className="detail-list">
            {pn && (
              <>
                <div>
                  <dt className="muted">{t("admin.col.partner")}</dt>
                  <dd>{pn.name}</dd>
                </div>
                <div>
                  <dt className="muted">{t("admin.ev.contact")}</dt>
                  <dd>{pn.contactName}</dd>
                </div>
                <div>
                  <dt className="muted">{t("common.phone")}</dt>
                  <dd>{pn.phone}</dd>
                </div>
              </>
            )}
            <div>
              <dt className="muted">{t("common.pickup")}</dt>
              <dd>{r.pickup}</dd>
            </div>
            <div>
              <dt className="muted">{t("admin.col.when")}</dt>
              <dd>{fmt.rideWhen(r)}</dd>
            </div>
            <div>
              <dt className="muted">{t("common.duration")}</dt>
              <dd>
                {r.durationMin} {t("common.min")}
              </dd>
            </div>
            {r.notes && (
              <div>
                <dt className="muted">{t("common.notes")}</dt>
                <dd>{r.notes}</dd>
              </div>
            )}
          </div>
          <div className="mt-4">
            <MapEmbed
              address={r.pickup}
              small
            />
          </div>
        </div>

        <div className="card">
          <h3 className="h2 mb-4">{t("admin.ev.assign")}</h3>
          <div className="flex flex-col gap-4">
            {twKeys.map((k) => {
              const tw = find(db.trishaws, k);
              return (
                <div
                  key={k}
                  className="field"
                >
                  <label
                    className="label"
                    htmlFor={`ev-as-${k}`}
                  >
                    {tw?.number || k}
                  </label>
                  <select
                    className="select"
                    id={`ev-as-${k}`}
                    value={r.pilots?.[k] || ""}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      update((d) => {
                        const ride = find(d.rides, r.id);
                        if (!ride || !ride.pilots) return;
                        ride.pilots[k] = val;
                        const all = Object.keys(ride.pilots).every(
                          (key) => !!ride.pilots![key],
                        );
                        ride.status = all ? "staffed" : "open";
                      });
                      toast(t("admin.saved"));
                    }}
                  >
                    <option value="">{t("admin.req.leaveOpen")}</option>
                    {assignable.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                      >
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="h2">{t("admin.ev.roster")}</h3>
          <div className="flex items-center gap-2">
            <span className="muted text-sm tabular-nums">
              {t("admin.ev.progress", { filled, total })}
            </span>
            {isFull && r.closeWhenFull && (
              <span className="badge badge-mint">{t("admin.ev.full")}</span>
            )}
          </div>
        </div>
        <div className="scroll-x">
          <div
            className="roster-grid"
            style={{
              gridTemplateColumns: `auto repeat(${twIds.length}, 1fr)`,
              minWidth: `${twIds.length * 10 + 6}rem`,
            }}
          >
            <div className="roster-head" />
            {twIds.map((twId) => {
              const tw = find(db.trishaws, twId);
              const p = find(db.pilots, r.pilots?.[twId]);
              return (
                <div
                  key={twId}
                  className="roster-head"
                >
                  {tw?.number || twId}
                  <div className="muted text-xs font-normal">
                    {p?.name || t("status.open")}
                  </div>
                </div>
              );
            })}
            {times.map((tm) => (
              <RosterRow
                key={tm}
                r={r}
                tm={tm}
                twIds={twIds}
                onAdd={(twId) => setRosterSlot({ time: tm, twId })}
              />
            ))}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="text-sm">{t("admin.ev.closeWhenFull")}</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={!!r.closeWhenFull}
              onChange={(e) => {
                const checked = e.target.checked;
                update((d) => {
                  const ride = find(d.rides, r.id);
                  if (ride) ride.closeWhenFull = checked;
                });
                toast(t("admin.saved"));
              }}
            />
            <span className="switch-slider" />
          </label>
        </div>
      </div>

      {cancel && (
        <CancelRideModal
          rideId={r.id}
          onClose={() => setCancel(false)}
        />
      )}
      {rosterSlot && (
        <RosterModal
          rideId={r.id}
          time={rosterSlot.time}
          twId={rosterSlot.twId}
          onClose={() => setRosterSlot(null)}
        />
      )}
    </>
  );
}

function RosterRow({
  r,
  tm,
  twIds,
  onAdd,
}: {
  r: Ride;
  tm: string;
  twIds: string[];
  onAdd: (twId: string) => void;
}) {
  return (
    <>
      <div className="roster-time">{tm}</div>
      {twIds.map((twId) => {
        const entry = (r.roster || []).find(
          (x) => x.time === tm && x.trishawId === twId,
        );
        return entry?.name ? (
          <div
            key={twId}
            className="roster-cell filled"
          >
            <span>{entry.name}</span>
            <span className="order-num">#{entry.order}</span>
          </div>
        ) : (
          <button
            key={twId}
            type="button"
            className="roster-cell"
            onClick={() => onAdd(twId)}
          >
            <Icon name="plus" />
          </button>
        );
      })}
    </>
  );
}

function RosterModal({
  rideId,
  time,
  twId,
  onClose,
}: {
  rideId: string;
  time: string;
  twId: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const [name, setName] = useState("");
  const [waiver, setWaiver] = useState(true);

  const r = find(db.rides, rideId);
  const taken = (r?.roster || []).map((x) => x.name).filter(Boolean);
  const suggestions = RESIDENTS.filter((n) => !taken.includes(n));

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onClose();
    update((d) => {
      const ride = find(d.rides, rideId);
      if (!ride || !ride.roster) return;
      const entry = ride.roster.find(
        (x) => x.time === time && x.trishawId === twId,
      );
      if (!entry) return;
      entry.name = trimmed;
      entry.order =
        ride.roster.reduce((mx, x) => Math.max(mx, x.order || 0), 0) + 1;
    });
    toast(t("admin.ev.riderAdded", { name: trimmed }));
  }

  return (
    <Modal
      open
      onClose={onClose}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="h2">{t("admin.ev.addRider")}</h3>
        <button
          type="button"
          className="icon-pill"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <Icon name="x" />
        </button>
      </div>
      <div className="flex flex-col gap-4">
        <div className="field">
          <label
            className="label"
            htmlFor="ros-name"
          >
            {t("admin.col.name")}
          </label>
          <input
            className="input"
            id="ros-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </div>
        {suggestions.length > 0 && (
          <div>
            <div className="hint mb-2">{t("admin.ev.suggestions")}</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={cn("chip", name === n && "active")}
                  onClick={() => setName(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
        <label className={cn("check-row", waiver && "checked")}>
          <input
            type="checkbox"
            checked={waiver}
            onChange={(e) => setWaiver(e.target.checked)}
          />
          <span>{t("admin.ev.waiverCoord")}</span>
        </label>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={add}
        >
          {t("common.add")}
        </button>
      </div>
    </Modal>
  );
}
