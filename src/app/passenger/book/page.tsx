"use client";

/* The booking wizard — one question per step, five steps, big targets.
   Step 1 also offers shortcuts: upcoming events and "book again" repeats. */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, uid, notify, find } from "@/lib/store";
import { toast } from "@/lib/ui";
import type { Ride, RideSlot, RideType } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { BackHead, SectionHead } from "@/components/chrome";
import { BtnHero } from "@/components/bits";
import { MapEmbed, AddressDatalist } from "@/components/MapEmbed";
import { usePassenger } from "../session";
import { Dots, BigOpt, Chip, PaxEventCard, myEvents } from "../parts";

interface BookState {
  step: number;
  type: RideType | null;
  day: "today" | "tomorrow" | "pick" | null;
  date: string;
  slot: RideSlot | null;
  time: string;
  pickup: string;
  destination: string;
  stops: string[];
  ret: boolean;
  riders: number;
  proxy: boolean;
  proxyName: string;
  proxyOk: boolean;
  notes: string;
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${`0${d.getMonth() + 1}`.slice(-2)}-${`0${d.getDate()}`.slice(-2)}`;
}

export default function BookPage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((st) => st.db)!;
  const update = useStore((st) => st.update);
  const session = usePassenger();
  const client = find(db.clients, session.userId);

  const [s, setS] = useState<BookState>(() => ({
    step: 1,
    type: null,
    day: null,
    date: "",
    slot: null,
    time: "",
    pickup: client?.address || "",
    destination: "",
    stops: [],
    ret: true,
    riders: 0,
    proxy: false,
    proxyName: "",
    proxyOk: false,
    notes: "",
  }));
  const set = (patch: Partial<BookState>) =>
    setS((prev) => ({ ...prev, ...patch }));

  const step2ok = !!(
    s.day &&
    (s.day !== "pick" || s.date) &&
    s.slot &&
    (s.slot !== "exact" || s.time)
  );
  const step3ok = !!(
    s.pickup.trim() &&
    (s.type !== "functional" || s.destination.trim())
  );
  const step4ok = s.proxy ? !!(s.proxyName.trim() && s.proxyOk) : s.riders > 0;

  const events = useMemo(() => myEvents(db, client).slice(0, 3), [db, client]);
  /* completed rides, deduped by route — "book again" skips straight to picking a day */
  const again = useMemo(() => {
    const seen: Record<string, boolean> = {};
    return db.rides
      .filter((r) => r.clientId === session.userId && r.status === "done")
      .sort((a, b) => b.ts - a.ts)
      .filter((r) => {
        const key = `${r.type}|${r.pickup}|${r.destination || ""}`;
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      })
      .slice(0, 3);
  }, [db, session.userId]);

  function computeTs(): number {
    let d = new Date();
    if (s.day === "tomorrow") d.setDate(d.getDate() + 1);
    else if (s.day === "pick" && s.date) {
      const p = s.date.split("-");
      d = new Date(+p[0], +p[1] - 1, +p[2]);
    }
    if (s.slot === "morning") d.setHours(9, 0, 0, 0);
    else if (s.slot === "afternoon") d.setHours(13, 0, 0, 0);
    else {
      const tp = (s.time || "12:00").split(":");
      d.setHours(+tp[0], +tp[1] || 0, 0, 0);
    }
    return d.getTime();
  }

  function sentence(): string {
    const ts = computeTs();
    const when =
      s.slot === "exact"
        ? t("pax.whenExact", { day: fmt.day(ts), time: fmt.time(ts) })
        : t(s.slot === "morning" ? "pax.whenMorning" : "pax.whenAfternoon", {
            day: fmt.day(ts),
          });
    let out =
      s.type === "functional"
        ? t("pax.sumErrand", {
            when,
            pickup: s.pickup.trim(),
            dest: s.destination.trim(),
          })
        : t("pax.sumPleasure", { when, pickup: s.pickup.trim() });
    if (s.type === "functional" && s.ret) out += ` ${t("pax.sumReturn")}`;
    if (s.riders === 2) out += ` ${t("pax.sumTwo")}`;
    if (s.proxy && s.proxyName.trim())
      out += ` ${t("pax.sumProxy", { name: s.proxyName.trim() })}`;
    return out;
  }

  function confirmBooking() {
    let newId = "";
    update((d) => {
      const id = uid("r");
      newId = id;
      const ts = computeTs();
      const dt = new Date(ts);
      let flag: Ride["flag"];
      let status: Ride["status"] = "open";
      if (
        dt.getDay() === 0 ||
        (s.slot === "exact" && (dt.getHours() < 9 || dt.getHours() >= 18))
      ) {
        status = "requested";
        flag = "outside_hours";
      } else if (s.slot === "exact" && ts < Date.now() + 4 * 36e5) {
        status = "requested";
        flag = "lead_time";
      }
      const proxyName = s.proxy ? s.proxyName.trim() : "";
      // `proxy` rides the Ride record like in the vanilla store (not yet in the shared type)
      const ride = {
        id,
        chapterId: "muc",
        type: s.type as RideType,
        status,
        clientId: session.userId,
        source: "app",
        ts,
        slot: s.slot as RideSlot,
        durationMin: 60,
        riders: s.riders || 1,
        pickup: s.pickup.trim(),
        destination:
          s.type === "functional" && s.destination.trim()
            ? s.destination.trim()
            : undefined,
        stops:
          s.type === "functional"
            ? s.stops.map((x) => x.trim()).filter(Boolean)
            : [],
        returnRide: s.type === "functional" ? !!s.ret : false,
        trishawId: status === "open" ? "t1" : null,
        pilotId: null,
        notes: s.notes.trim(),
        ...(proxyName ? { proxy: { name: proxyName } } : {}),
        ...(flag ? { flag } : {}),
        debrief: null,
        createdAt: Date.now(),
      } as unknown as Ride;
      d.rides.push(ride);
      const when = fmt.rideWhen(ride);
      if (status === "open") {
        notify(
          d,
          "pilot",
          "notif.rideOpen",
          { name: session.name, when, place: ride.pickup },
          `/pilot/rides/${id}`,
        );
        notify(
          d,
          "admin",
          "notif.newRequest",
          { name: session.name, when },
          "/admin/requests",
        );
      } else {
        notify(
          d,
          "admin",
          "notif.requestFlagged",
          { name: session.name, reason: t(`pax.flag.${flag}`) },
          "/admin/requests",
        );
      }
    });
    toast(t("pax.toastBooked"), "success");
    router.push(`/passenger/booked/${newId}`);
  }

  const nextBtn = (ok: boolean) => (
    <BtnHero
      label={t("common.next")}
      tone="ink"
      disabled={!ok}
      onClick={() => set({ step: s.step + 1 })}
    />
  );

  let body: React.ReactNode = null;
  if (s.step === 1) {
    body = (
      <>
        {events.length > 0 && (
          <div className="reveal flex flex-col gap-2">
            <SectionHead
              title={t("pax.eventsTitle")}
              linkText={t("pax.allEvents")}
              href="/passenger/events"
            />
            <div className="rail">
              {events.map((r) => (
                <PaxEventCard
                  key={r.id}
                  ride={r}
                  db={db}
                />
              ))}
            </div>
          </div>
        )}
        {again.length > 0 && (
          <div className="reveal flex flex-col gap-2">
            <div className="eyebrow">{t("pax.bookAgain")}</div>
            <div className="hint -mt-1">{t("pax.bookAgainHint")}</div>
            {again.map((r) => {
              const rideProxy = (
                r as unknown as { proxy?: { name: string } | null }
              ).proxy;
              return (
                <button
                  key={r.id}
                  type="button"
                  className="record-card flex items-center gap-3.5"
                  onClick={() => {
                    set({
                      type: r.type,
                      pickup: r.pickup || "",
                      destination: r.destination || "",
                      stops: (r.stops || []).slice(),
                      ret: !!r.returnRide,
                      ...(rideProxy?.name
                        ? {
                            proxy: true,
                            proxyName: rideProxy.name,
                            proxyOk: true,
                          }
                        : { proxy: false, riders: r.riders || 1 }),
                      step: 2,
                    });
                  }}
                >
                  <span
                    className={`icon-tile icon-tile-sm ${r.type === "functional" ? "on-grey" : "on-red"}`}
                  >
                    <Icon name={r.type === "functional" ? "route" : "heart"} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {r.destination
                        ? `${r.pickup} → ${r.destination}`
                        : r.pickup}
                    </span>
                    <span className="hint block">
                      {t(`type.${r.type}`)} · {fmt.date(r.ts)}
                    </span>
                  </span>
                  <Icon
                    name="chevronRight"
                    className="muted"
                  />
                </button>
              );
            })}
          </div>
        )}
        {(events.length > 0 || again.length > 0) && (
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs muted">{t("auth.or")}</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        )}
        <div className="display display-sm">{t("pax.q1")}</div>
        <div className="flex flex-col gap-3">
          <BigOpt
            icon="heart"
            tone="on-red"
            title={t("type.pleasure")}
            hint={t("pax.pleasureSub")}
            selected={s.type === "pleasure"}
            onClick={() => set({ type: "pleasure", step: 2 })}
          />
          <BigOpt
            icon="route"
            tone="on-grey"
            title={t("type.functional")}
            hint={t("pax.errandSub")}
            selected={s.type === "functional"}
            onClick={() => set({ type: "functional", step: 2 })}
          />
        </div>
      </>
    );
  } else if (s.step === 2) {
    body = (
      <>
        <div className="display display-sm">{t("pax.q2")}</div>
        <div className="flex flex-wrap gap-2">
          <Chip
            label={t("common.today")}
            active={s.day === "today"}
            onClick={() => set({ day: "today" })}
          />
          <Chip
            label={t("common.tomorrow")}
            active={s.day === "tomorrow"}
            onClick={() => set({ day: "tomorrow" })}
          />
          <Chip
            label={t("pax.pickDay")}
            icon="calendar"
            active={s.day === "pick"}
            onClick={() => set({ day: "pick" })}
          />
        </div>
        {s.day === "pick" && (
          <div className="field">
            <label
              className="label"
              htmlFor="wiz-date"
            >
              {t("common.date")}
            </label>
            <input
              id="wiz-date"
              className="input"
              type="date"
              min={isoToday()}
              value={s.date}
              onChange={(e) => set({ date: e.target.value })}
            />
          </div>
        )}
        <div className="label">{t("pax.whatTime")}</div>
        <div className="flex flex-wrap gap-2">
          <Chip
            label={t("slot.morning")}
            icon="sunMedium"
            active={s.slot === "morning"}
            onClick={() => set({ slot: "morning" })}
          />
          <Chip
            label={t("slot.afternoon")}
            icon="sunset"
            active={s.slot === "afternoon"}
            onClick={() => set({ slot: "afternoon" })}
          />
          <Chip
            label={t("slot.exact")}
            icon="clock"
            active={s.slot === "exact"}
            onClick={() => set({ slot: "exact" })}
          />
        </div>
        {s.slot === "exact" && (
          <div className="field">
            <label
              className="label"
              htmlFor="wiz-time"
            >
              {t("common.time")}
            </label>
            <input
              id="wiz-time"
              className="input"
              type="time"
              value={s.time}
              onChange={(e) => set({ time: e.target.value })}
            />
          </div>
        )}
        {nextBtn(step2ok)}
      </>
    );
  } else if (s.step === 3) {
    body = (
      <>
        <div className="display display-sm">
          {t(s.type === "functional" ? "pax.q3errand" : "pax.q3pleasure")}
        </div>
        <div className="field">
          <label
            className="label"
            htmlFor="wiz-pickup"
          >
            {t("common.pickup")}
          </label>
          <input
            id="wiz-pickup"
            className="input"
            type="text"
            list="cwa-addresses"
            value={s.pickup}
            onChange={(e) => set({ pickup: e.target.value })}
          />
        </div>
        {s.type === "functional" && (
          <>
            <div className="field">
              <label
                className="label"
                htmlFor="wiz-dest"
              >
                {t("common.destination")}
              </label>
              <input
                id="wiz-dest"
                className="input"
                type="text"
                list="cwa-addresses"
                value={s.destination}
                placeholder={t("pax.destPh")}
                onChange={(e) => set({ destination: e.target.value })}
              />
            </div>
            {s.stops.map((v, i) => (
              <div
                key={i}
                className="field"
              >
                <label className="label">
                  {t("common.stop")} {i + 1}
                </label>
                <input
                  className="input"
                  type="text"
                  list="cwa-addresses"
                  value={v}
                  onChange={(e) => {
                    const stops = s.stops.slice();
                    stops[i] = e.target.value;
                    set({ stops });
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="btn btn-outline btn-block"
              onClick={() => set({ stops: [...s.stops, ""] })}
            >
              <Icon name="plus" />
              {t("pax.addStop")}
            </button>
            <div className="card flex items-center justify-between gap-3 py-3.5">
              <div>
                <div className="font-semibold">{t("common.return")}</div>
                <div className="hint">{t("pax.returnHint")}</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={s.ret}
                  onChange={(e) => set({ ret: e.target.checked })}
                />
                <span className="switch-slider" />
              </label>
            </div>
          </>
        )}
        {s.pickup.trim().length >= 4 && (
          <MapEmbed
            address={s.pickup.trim()}
            small
          />
        )}
        <AddressDatalist />
        {nextBtn(step3ok)}
      </>
    );
  } else if (s.step === 4) {
    body = (
      <>
        <div className="display display-sm">{t("pax.q4")}</div>
        <div className="flex flex-col gap-3">
          <BigOpt
            icon="user"
            tone="on-mint"
            title={t("pax.justMe")}
            selected={!s.proxy && s.riders === 1}
            onClick={() =>
              set({
                proxy: false,
                proxyName: "",
                proxyOk: false,
                riders: 1,
                step: 5,
              })
            }
          />
          <BigOpt
            icon="users"
            tone="on-grey"
            title={t("pax.companion")}
            selected={!s.proxy && s.riders === 2}
            onClick={() =>
              set({
                proxy: false,
                proxyName: "",
                proxyOk: false,
                riders: 2,
                step: 5,
              })
            }
          />
          <BigOpt
            icon="pencil"
            tone="on-grey"
            title={t("pax.forSomeone")}
            selected={s.proxy}
            onClick={() => !s.proxy && set({ proxy: true, riders: 1 })}
          />
        </div>
        {s.proxy && (
          <>
            <div className="field">
              <label
                className="label"
                htmlFor="wiz-proxy-name"
              >
                {t("pax.proxyName")}
              </label>
              <input
                id="wiz-proxy-name"
                className="input"
                type="text"
                value={s.proxyName}
                placeholder={t("pax.proxyNamePh")}
                onChange={(e) => set({ proxyName: e.target.value })}
              />
            </div>
            <label className={`check-row${s.proxyOk ? " checked" : ""}`}>
              <input
                type="checkbox"
                checked={s.proxyOk}
                onChange={(e) => set({ proxyOk: e.target.checked })}
              />
              <span>{t("waiver.proxy")}</span>
            </label>
            {nextBtn(step4ok)}
          </>
        )}
      </>
    );
  } else {
    body = (
      <>
        <div className="display display-sm">{t("pax.q5")}</div>
        <div className="tile tile-mint">
          <p className="quote-text">{sentence()}</p>
          <div className="tile-glyph">
            <Icon name="bike" />
          </div>
        </div>
        <div className="field">
          <label
            className="label"
            htmlFor="wiz-notes"
          >
            {t("common.notes")}{" "}
            <span className="muted">({t("common.optional")})</span>
          </label>
          <textarea
            id="wiz-notes"
            className="textarea"
            value={s.notes}
            placeholder={t("pax.notesPh")}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </div>
        <BtnHero
          label={t("pax.confirmBook")}
          icon="check"
          onClick={confirmBooking}
        />
      </>
    );
  }

  return (
    <>
      <BackHead
        title={t("pax.bookRide")}
        sub={t("common.details")}
        onBack={() =>
          s.step > 1 ? set({ step: s.step - 1 }) : router.push("/passenger")
        }
      />
      <div className="app-body gap-5">
        <Dots
          step={s.step}
          total={5}
        />
        {body}
      </div>
    </>
  );
}
