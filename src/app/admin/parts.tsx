"use client";

/* Shared helpers for the admin back-office pages. */

import { useState } from "react";
import { useI18n, t, fmt } from "@/lib/i18n";
import { useStore, notify, find } from "@/lib/store";
import { toast } from "@/lib/ui";
import type { Chapter, Client, Database, Pilot, Ride } from "@/lib/types";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { ChatMessageRow } from "@/components/ChatThread";
import { EmptyState } from "@/components/chrome";
import { cn } from "@/lib/utils";

export const CH = "muc";

/* ---------- lookups ---------- */
export const chapterOf = (d: Database) => find(d.chapters, CH) as Chapter;
export const mucRides = (d: Database) =>
  d.rides.filter((r) => r.chapterId === CH);
export const myPilots = (d: Database) =>
  d.pilots.filter((p) => p.chapterId === CH);
export const ridePilots = (d: Database) =>
  myPilots(d).filter(
    (p) => (p.role === "pilot" || p.role === "captain") && p.trained,
  );

export function rideWho(d: Database, r: Ride): string {
  if (r.clientId) return find(d.clients, r.clientId)?.name || "—";
  if (r.partnerId) return find(d.partners, r.partnerId)?.name || "—";
  if (r.type === "event") return r.pickup || t("admin.ev.public");
  return "—";
}

export const rideHref = (r: Ride) => `/admin/rides/${r.id}`;

/* ---------- date utils ---------- */
export const pad2 = (n: number) => `0${n}`.slice(-2);
export function dateStr(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function timeStr(ts: number) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
export function sameMonth(ts: number) {
  const d = new Date(ts);
  const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}
export function sameDay(a: number, b: number) {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}
export function tsFrom(
  dateVal: string,
  slot: string,
  timeVal: string,
  ch?: Chapter | null,
): number {
  const sw = ch?.slotWindows || {
    morning: [9, 12] as [number, number],
    afternoon: [13, 17] as [number, number],
  };
  let h: number;
  let m = 0;
  if (slot === "morning") h = sw.morning[0];
  else if (slot === "afternoon") h = sw.afternoon[0];
  else {
    const p = (timeVal || "10:00").split(":");
    h = parseInt(p[0], 10) || 10;
    m = parseInt(p[1], 10) || 0;
  }
  const dp = (dateVal || dateStr(Date.now())).split("-");
  return new Date(
    parseInt(dp[0], 10),
    parseInt(dp[1], 10) - 1,
    parseInt(dp[2], 10),
    h,
    m,
    0,
    0,
  ).getTime();
}
/* weekday label for a JS day int (0=Sun) — locale-aware, via a known reference week */
export const dayName = (di: number) =>
  fmt.weekday(new Date(2026, 0, 4 + di).getTime());
export const dayNames = (list?: number[]) =>
  list && list.length ? [...list].sort().map(dayName).join(", ") : "";

/* ---------- badges ---------- */
export function SrcBadge({ s }: { s?: string }) {
  const { t } = useI18n();
  const cls =
    (
      {
        app: "badge-grey",
        whatsapp: "badge-mint",
        phone: "badge-muted",
        admin: "badge-muted",
      } as Record<string, string>
    )[s || "admin"] || "badge-muted";
  return (
    <span className={cn("badge", cls)}>{t(`admin.src.${s || "admin"}`)}</span>
  );
}

export function ReqFlags({ d, r }: { d: Database; r: Ride }) {
  const { t } = useI18n();
  const c = find(d.clients, r.clientId);
  if (!r.flag && (!c || c.waiverSigned)) return <>—</>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {r.flag && (
        <span className="badge badge-red">{t(`admin.flag.${r.flag}`)}</span>
      )}
      {c && !c.waiverSigned && (
        <span className="badge badge-solid-red">{t("admin.flag.waiver")}</span>
      )}
    </span>
  );
}

export function WaiverBadge({ c }: { c: Client }) {
  const { t } = useI18n();
  if (c.waiverSigned && c.signedBy === "proxy")
    return (
      <span className="badge badge-grey">{t("admin.cli.proxySigned")}</span>
    );
  if (c.waiverSigned)
    return <span className="badge badge-mint">{t("common.signed")}</span>;
  return <span className="badge badge-red">{t("common.pending")}</span>;
}

/* ---------- assign a pilot to an open ride ---------- */
export function AssignPilotModal({
  rideId,
  onClose,
}: {
  rideId: string;
  onClose: () => void;
}) {
  const { t, fmt } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const r = find(db.rides, rideId);
  const pilots = ridePilots(db);
  const [pid, setPid] = useState(pilots[0]?.id || "");
  if (!r) return null;
  const who = rideWho(db, r);

  return (
    <Modal
      open
      onClose={onClose}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="h2">{t("admin.assign.title")}</h3>
        <button
          type="button"
          className="icon-pill"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <Icon name="x" />
        </button>
      </div>
      {!pilots.length ? (
        <EmptyState
          icon="users"
          text={t("admin.assign.none")}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="detail-list">
            <div>
              <dt>{t("common.passenger")}</dt>
              <dd>{who}</dd>
            </div>
            <div>
              <dt>{t("admin.col.when")}</dt>
              <dd>{fmt.rideWhen(r)}</dd>
            </div>
            <div>
              <dt>{t("common.pickup")}</dt>
              <dd>{r.pickup}</dd>
            </div>
          </div>
          <div className="field">
            <label
              className="label"
              htmlFor="as-pilot"
            >
              {t("common.pilot")}
            </label>
            <select
              id="as-pilot"
              className="select"
              value={pid}
              onChange={(e) => setPid(e.target.value)}
            >
              {pilots.map((p: Pilot) => {
                const av = p.availability?.length
                  ? t("admin.assign.avail", { days: dayNames(p.availability) })
                  : t("admin.assign.availNone");
                return (
                  <option
                    key={p.id}
                    value={p.id}
                  >{`${p.name} · ${av}`}</option>
                );
              })}
            </select>
            <span className="hint">{t("admin.assign.hint")}</span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              let pName = "";
              onClose();
              update((d) => {
                const ride = find(d.rides, rideId);
                const p = find(d.pilots, pid);
                if (!ride || !p) return;
                pName = p.name;
                ride.status = "staffed";
                ride.pilotId = pid;
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
                if (ride.clientId) {
                  notify(
                    d,
                    `client:${ride.clientId}`,
                    "notif.pilotAssigned",
                    { pilot: p.name },
                    `/passenger/rides/${ride.id}`,
                  );
                }
              });
              toast(t("admin.assign.toast", { pilot: pName }));
            }}
          >
            {t("admin.assign.do")}
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ---------- cancel ride confirm ---------- */
export function CancelRideModal({
  rideId,
  onClose,
}: {
  rideId: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const update = useStore((s) => s.update);
  return (
    <Modal
      open
      onClose={onClose}
    >
      <h3 className="h2 mb-2">{t("admin.ride.cancelQ")}</h3>
      <p className="muted text-sm">{t("admin.ride.cancelBody")}</p>
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onClose}
        >
          {t("admin.ride.keep")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            onClose();
            update((d) => {
              const ride = find(d.rides, rideId);
              if (!ride) return;
              ride.status = "cancelled";
              const cl = find(d.clients, ride.clientId);
              if (ride.clientId) {
                notify(
                  d,
                  `client:${ride.clientId}`,
                  "notif.cancelled",
                  { name: cl?.name || "", when: fmt.rideWhen(ride) },
                  `/passenger/rides/${ride.id}`,
                );
              }
              const eventPiloted =
                ride.pilots && Object.values(ride.pilots).some(Boolean);
              if (ride.pilotId || eventPiloted) {
                notify(
                  d,
                  "pilot",
                  "notif.cancelled",
                  {
                    name: cl?.name || rideWho(d, ride),
                    when: fmt.rideWhen(ride),
                  },
                  `/pilot/rides/${ride.id}`,
                );
              }
            });
            toast(t("admin.ride.cancelledToast"), "info");
          }}
        >
          {t("admin.ride.cancel")}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- admin chat box (client + pilot get separately-routed pushes) ---------- */
export function AdminChat({
  rideId,
  maxHeight = "360px",
}: {
  rideId: string;
  maxHeight?: string;
}) {
  const { t } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const [text, setText] = useState("");
  const chat = db.chats.find((c) => c.rideId === rideId);

  if (!chat)
    return (
      <div className="card">
        <EmptyState
          icon="chat"
          text={t("admin.ride.noChat")}
        />
      </div>
    );

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    update((d) => {
      const c = d.chats.find((x) => x.rideId === rideId);
      const ride = find(d.rides, rideId);
      if (!c || !ride) return;
      c.messages.push({
        from: "admin",
        name: "Petra Klein",
        text: trimmed,
        ts: Date.now(),
      });
      if (ride.clientId)
        notify(
          d,
          `client:${ride.clientId}`,
          "notif.message",
          { name: "Petra Klein", text: trimmed.slice(0, 60) },
          `/passenger/chats/${rideId}`,
        );
      if (ride.pilotId)
        notify(
          d,
          "pilot",
          "notif.message",
          { name: "Petra Klein", text: trimmed.slice(0, 60) },
          `/pilot/chats/${rideId}`,
        );
    });
  }

  return (
    <div className="card card-flush">
      <div
        className="chat-scroll"
        style={{ maxHeight, minHeight: "14rem" }}
        ref={(el) => {
          if (el) el.scrollTop = el.scrollHeight;
        }}
      >
        {chat.messages.map((m, i) => (
          <ChatMessageRow
            key={i}
            m={m}
            myRole="admin"
          />
        ))}
      </div>
      <div className="chat-input-row">
        <input
          className="input"
          placeholder={t("chat.placeholder")}
          aria-label={t("common.chat")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button
          type="button"
          className="send-btn"
          aria-label={t("common.send")}
          onClick={send}
        >
          <Icon name="send" />
        </button>
      </div>
    </div>
  );
}
