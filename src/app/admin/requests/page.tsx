"use client";

/* Requests inbox: bookings that failed auto-validation, with plain-language
   validation and a scheduling drawer (date/slot/trishaw/pilot + waiver). */

import { useState } from "react";
import { useI18n, fmt } from "@/lib/i18n";
import { useStore, notify, find } from "@/lib/store";
import { toast } from "@/lib/ui";
import type { RideSlot } from "@/lib/types";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/chrome";
import { TypeBadge } from "@/components/bits";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { MapEmbed } from "@/components/MapEmbed";
import { cn } from "@/lib/utils";
import {
  CH,
  chapterOf,
  mucRides,
  ridePilots,
  rideWho,
  SrcBadge,
  ReqFlags,
  dateStr,
  timeStr,
  tsFrom,
} from "../parts";

export default function RequestsPage() {
  const { t, fmt } = useI18n();
  const db = useStore((s) => s.db)!;
  const [openId, setOpenId] = useState<string | null>(null);

  const reqs = mucRides(db)
    .filter((r) => r.status === "requested")
    .sort((a, b) => a.ts - b.ts);

  return (
    <>
      <div>
        <h1 className="h1">{t("admin.nav.requests")}</h1>
        <p className="muted mt-1 text-sm">{t("admin.req.intro")}</p>
      </div>
      {!reqs.length ? (
        <div className="card">
          <EmptyState
            icon="checkCheck"
            text={t("admin.req.empty")}
          />
        </div>
      ) : (
        <ResponsiveTable
          rows={reqs}
          cols={[
            {
              label: t("common.passenger"),
              render: (r) => (
                <span className="font-semibold">{rideWho(db, r)}</span>
              ),
            },
            { label: t("admin.col.when"), render: (r) => fmt.rideWhen(r) },
            {
              label: t("admin.col.type"),
              render: (r) => <TypeBadge type={r.type} />,
            },
            {
              label: t("admin.col.source"),
              render: (r) => <SrcBadge s={r.source} />,
            },
            {
              label: t("admin.col.checks"),
              render: (r) => (
                <ReqFlags
                  d={db}
                  r={r}
                />
              ),
            },
          ]}
          card={(r) => (
            <>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{rideWho(db, r)}</div>
                  <div className="muted text-sm">{fmt.rideWhen(r)}</div>
                </div>
                <SrcBadge s={r.source} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <TypeBadge type={r.type} />
                <ReqFlags
                  d={db}
                  r={r}
                />
              </div>
            </>
          )}
          onRow={(r) => setOpenId(r.id)}
        />
      )}
      {openId && (
        <RequestDrawer
          id={openId}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

function RequestDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { t, fmt: f } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const r = find(db.rides, id);
  const c = find(db.clients, r?.clientId);
  const ch = chapterOf(db);

  const [slot, setSlot] = useState<RideSlot>((r?.slot as RideSlot) || "exact");
  const [dateVal, setDateVal] = useState(r ? dateStr(r.ts) : "");
  const [timeVal, setTimeVal] = useState(r ? timeStr(r.ts) : "10:00");
  const isRosenau = /rosenau/i.test(r?.pickup || "");
  /* proximity mock: Rosenau pickups are closest to the Rosenau shed (t2) */
  const twOpts = db.trishaws
    .map((tw) => {
      const g = find(db.garages, tw.garageId);
      const near = (tw.id === "t2") === isRosenau;
      return {
        id: tw.id,
        near,
        label: `${tw.number} · ${g?.name || ""} · ${near ? "400 m" : "2.1 km"}`,
      };
    })
    .sort((a, b) => (b.near ? 1 : 0) - (a.near ? 1 : 0));
  const [twVal, setTwVal] = useState(() => (isRosenau ? "t2" : "t1"));
  const [plVal, setPlVal] = useState("");
  const [waiver, setWaiver] = useState(false);
  const pilots = ridePilots(db);

  if (!r) return null;

  function approve() {
    onClose();
    update((d) => {
      const ride = find(d.rides, id);
      if (!ride) return;
      const chp = find(d.chapters, CH);
      ride.ts = tsFrom(dateVal, slot, timeVal, chp);
      ride.slot = slot;
      delete ride.flag;
      delete ride.waiverPending;
      const cl = find(d.clients, ride.clientId);
      if (waiver && cl) cl.waiverSigned = true;
      ride.trishawId = twVal;
      if (plVal) {
        ride.status = "staffed";
        ride.pilotId = plVal;
        if (!find(d.chats, `chat-${ride.id}`)) {
          d.chats.push({
            id: `chat-${ride.id}`,
            rideId: ride.id,
            messages: [
              {
                from: "system",
                name: "",
                text: "",
                tKey: "chat.sysCreated",
                ts: Date.now(),
              },
            ],
          });
        }
        const pl = find(d.pilots, plVal);
        notify(
          d,
          `client:${ride.clientId}`,
          "notif.pilotAssigned",
          { pilot: pl?.name || "" },
          `/passenger/rides/${ride.id}`,
        );
      } else {
        ride.status = "open";
        ride.pilotId = null;
        notify(
          d,
          "pilot",
          "notif.rideOpen",
          {
            name: cl?.name || "",
            when: fmt.rideWhen(ride),
            place: ride.pickup,
          },
          `/pilot/rides/${ride.id}`,
        );
        notify(
          d,
          `client:${ride.clientId}`,
          "notif.scheduled",
          { when: fmt.rideWhen(ride) },
          `/passenger/rides/${ride.id}`,
        );
      }
    });
    toast(t("admin.req.scheduledToast"));
  }

  function decline() {
    onClose();
    update((d) => {
      const ride = find(d.rides, id);
      if (!ride) return;
      ride.status = "cancelled";
      const cl = find(d.clients, ride.clientId);
      notify(
        d,
        `client:${ride.clientId}`,
        "notif.cancelled",
        { name: cl?.name || "", when: fmt.rideWhen(ride) },
        `/passenger/rides/${ride.id}`,
      );
    });
    toast(t("admin.req.declinedToast"), "info");
  }

  return (
    <Modal
      open
      onClose={onClose}
      drawer
    >
      <div className="drawer-header">
        <div className="min-w-0 flex-1">
          <div className="h2">{t("admin.req.drawerTitle")}</div>
          <div className="muted text-sm">{c?.name || ""}</div>
        </div>
        <button
          type="button"
          className="icon-pill"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <Icon name="x" />
        </button>
      </div>

      <div className="drawer-body">
        <div className="flex flex-col gap-5">
          <div>
            <div className="muted mb-2 text-sm font-semibold">
              {t("admin.req.summary")}
            </div>
            <div className="detail-list">
              <div>
                <dt>{t("common.passenger")}</dt>
                <dd>{c?.name || "—"}</dd>
              </div>
              <div>
                <dt>{t("admin.req.requestedFor")}</dt>
                <dd>{f.rideWhen(r)}</dd>
              </div>
              <div>
                <dt>{t("admin.col.type")}</dt>
                <dd>
                  <TypeBadge type={r.type} />
                </dd>
              </div>
              <div>
                <dt>{t("common.passengers")}</dt>
                <dd>{r.riders}</dd>
              </div>
              <div>
                <dt>{t("common.pickup")}</dt>
                <dd>{r.pickup}</dd>
              </div>
              <div>
                <dt>{t("admin.col.source")}</dt>
                <dd>
                  <SrcBadge s={r.source} />
                </dd>
              </div>
              {r.notes && (
                <div>
                  <dt>{t("common.notes")}</dt>
                  <dd>{r.notes}</dd>
                </div>
              )}
            </div>
            <div className="mt-3">
              <MapEmbed
                address={r.pickup}
                small
              />
            </div>
          </div>

          {r.flag === "outside_hours" && (
            <div className="alert alert-red">
              <Icon name="alert" />
              <div>
                <div className="font-bold">{t("admin.flag.outside_hours")}</div>
                <div>
                  {t("admin.req.vOutside", {
                    name: c?.name || "",
                    time: f.time(r.ts),
                    open: ch.openHour,
                    close: ch.closeHour,
                  })}
                </div>
                <div className="mt-1 text-sm">{t("admin.req.vOutsideTip")}</div>
              </div>
            </div>
          )}
          {r.flag === "lead_time" && (
            <div className="alert alert-red">
              <Icon name="alert" />
              <div>
                <div className="font-bold">{t("admin.flag.lead_time")}</div>
                <div>{t("admin.req.vLead", { h: ch.leadTimeHours })}</div>
                <div className="mt-1 text-sm">{t("admin.req.vLeadTip")}</div>
              </div>
            </div>
          )}

          <div className="field">
            <label
              className="label"
              htmlFor="req-date"
            >
              {t("common.date")}
            </label>
            <input
              type="date"
              className="input"
              id="req-date"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
            />
          </div>

          <div className="field">
            <span className="label">{t("admin.req.slotLabel")}</span>
            <div className="flex flex-wrap gap-2">
              {(["morning", "afternoon", "exact"] as RideSlot[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={cn("chip", s === slot && "active")}
                  onClick={() => setSlot(s)}
                >
                  {t(`slot.${s}`)}
                </button>
              ))}
            </div>
          </div>

          {slot === "exact" && (
            <div className="field">
              <label
                className="label"
                htmlFor="req-time"
              >
                {t("common.time")}
              </label>
              <input
                type="time"
                className="input"
                id="req-time"
                value={timeVal}
                onChange={(e) => setTimeVal(e.target.value)}
              />
            </div>
          )}

          <div className="field">
            <label
              className="label"
              htmlFor="req-trishaw"
            >
              {t("common.trishaw")}
            </label>
            <select
              className="select"
              id="req-trishaw"
              value={twVal}
              onChange={(e) => setTwVal(e.target.value)}
            >
              {twOpts.map((o) => (
                <option
                  key={o.id}
                  value={o.id}
                >
                  {o.label}
                </option>
              ))}
            </select>
            <span className="hint">{t("admin.req.trishawHint")}</span>
          </div>

          <div className="field">
            <label
              className="label"
              htmlFor="req-pilot"
            >
              {t("common.pilot")}
            </label>
            <select
              className="select"
              id="req-pilot"
              value={plVal}
              onChange={(e) => setPlVal(e.target.value)}
            >
              <option value="">{t("admin.req.leaveOpen")}</option>
              {pilots.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {c && !c.waiverSigned && (
            <label className={cn("check-row", waiver && "checked")}>
              <input
                type="checkbox"
                checked={waiver}
                onChange={(e) => setWaiver(e.target.checked)}
              />
              <span>{t("admin.req.waiverToday")}</span>
            </label>
          )}
        </div>
      </div>

      <div className="drawer-footer">
        <button
          type="button"
          className="btn btn-destructive-outline"
          onClick={decline}
        >
          {t("admin.req.decline")}
        </button>
        <button
          type="button"
          className="btn btn-primary grow"
          onClick={approve}
        >
          {t("admin.req.schedule")}
        </button>
      </div>
    </Modal>
  );
}
