"use client";

/* The three-step "plan event" wizard: where -> when & capacity (live roster
   preview) -> review. Shared by /admin/events and the partner handoff on
   /admin/rides?plan=<partnerId>. */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, uid, find } from "@/lib/store";
import { toast } from "@/lib/ui";
import type { RosterSlot } from "@/lib/types";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { MapEmbed, AddressDatalist } from "@/components/MapEmbed";
import { cn } from "@/lib/utils";
import { CH, chapterOf, pad2, dateStr, tsFrom } from "../parts";

export function EventWizard({
  prePartnerId,
  onClose,
}: {
  prePartnerId?: string | null;
  onClose: () => void;
}) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const ch = chapterOf(db);

  const [step, setStep] = useState(prePartnerId ? 1 : 0);
  const [where, setWhere] = useState<"partner" | "public" | null>(
    prePartnerId ? "partner" : null,
  );
  const [partnerId, setPartnerId] = useState<string | null>(
    prePartnerId || null,
  );
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(() => dateStr(Date.now() + 7 * 864e5));
  const [time, setTime] = useState("10:00");
  const [durationMin, setDurationMin] = useState(120);
  const [trishaws, setTrishaws] = useState<string[]>(
    db.trishaws.map((tw) => tw.id),
  );
  const [slotMin, setSlotMin] = useState(30);

  const place =
    where === "partner" ? find(db.partners, partnerId)?.address || "" : address;
  const placeName =
    where === "partner" ? find(db.partners, partnerId)?.name || "" : address;

  const slotTimes = useMemo(() => {
    const n = Math.max(1, Math.floor(durationMin / slotMin));
    const p = time.split(":");
    const start = (parseInt(p[0], 10) || 10) * 60 + (parseInt(p[1], 10) || 0);
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const tot = start + i * slotMin;
      out.push(`${pad2(Math.floor(tot / 60) % 24)}:${pad2(tot % 60)}`);
    }
    return out;
  }, [time, durationMin, slotMin]);

  const openH = ch?.openHour ?? 9;
  const closeH = ch?.closeHour ?? 18;
  const timeSlots: string[] = [];
  for (let h = openH; h <= closeH; h++) {
    timeSlots.push(`${pad2(h)}:00`);
    timeSlots.push(`${pad2(h)}:30`);
  }
  const timeVal = timeSlots.includes(time) ? time : timeSlots[0];

  function create() {
    const nid = uid("r");
    const isPublic = where === "public";
    const roster: RosterSlot[] = [];
    slotTimes.forEach((tm) => {
      trishaws.forEach((id) =>
        roster.push({ time: tm, trishawId: id, name: null, order: null }),
      );
    });
    const pilots: Record<string, string | null> = {};
    trishaws.forEach((id) => (pilots[id] = null));
    const ts = tsFrom(date, "exact", timeVal, ch);
    const pickup = place;
    onClose();
    update((d) => {
      d.rides.push({
        id: nid,
        chapterId: CH,
        type: "event",
        status: "open",
        public: isPublic,
        partnerId: isPublic ? null : partnerId,
        source: "admin",
        ts,
        slot: "exact",
        durationMin,
        riders: 0,
        pickup,
        stops: [],
        returnRide: false,
        trishaws: [...trishaws],
        pilots,
        trishawId: null,
        pilotId: null,
        roster,
        closeWhenFull: true,
        notes: "",
        debrief: null,
        createdAt: Date.now(),
      });
    });
    toast(t("admin.par.plannedToast"));
    router.push(`/admin/rides/${nid}`);
  }

  const preview = !trishaws.length ? (
    <div className="alert alert-red">
      <Icon name="alert" />
      <div>{t("admin.ev.needTrishaw")}</div>
    </div>
  ) : (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="muted text-sm font-semibold">
          {t("admin.ev.preview")}
        </span>
        <span className="muted text-sm tabular-nums">
          {t("admin.ev.slotsN", { n: slotTimes.length * trishaws.length })}
        </span>
      </div>
      <div className="scroll-x">
        <div
          className="roster-grid"
          style={{
            gridTemplateColumns: `auto repeat(${trishaws.length}, 1fr)`,
            minWidth: `${trishaws.length * 6 + 4}rem`,
          }}
        >
          <div className="roster-head" />
          {trishaws.map((id) => (
            <div
              key={id}
              className="roster-head"
            >
              {find(db.trishaws, id)?.number || id}
            </div>
          ))}
          {slotTimes.map((tm) => (
            <PreviewRow
              key={tm}
              tm={tm}
              n={trishaws.length}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="h2">{t("admin.ev.plan")}</h3>
        <button
          type="button"
          className="icon-pill"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <Icon name="x" />
        </button>
      </div>
      <div className="progress-dots mb-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={i === step ? "current" : i < step ? "done" : ""}
          />
        ))}
      </div>

      {step === 0 && (
        <>
          <h4 className="h2 mb-4">{t("admin.ev.wWhere")}</h4>
          <div className="flex flex-col gap-3">
            {db.partners.map((pn) => (
              <button
                key={pn.id}
                type="button"
                className={cn(
                  "big-option",
                  where === "partner" && partnerId === pn.id && "selected",
                )}
                onClick={() => {
                  setWhere("partner");
                  setPartnerId(pn.id);
                  setStep(1);
                }}
              >
                <div className="min-w-0 flex-1">
                  <div>{pn.name}</div>
                  <div className="hint text-sm">
                    {t("admin.ev.atPartner")} · {pn.address}
                  </div>
                </div>
              </button>
            ))}
            <button
              type="button"
              className={cn("big-option", where === "public" && "selected")}
              onClick={() => setWhere("public")}
            >
              <div className="min-w-0 flex-1">
                <div>{t("admin.ev.publicLoc")}</div>
                <div className="hint text-sm">{t("admin.ev.publicHint")}</div>
              </div>
            </button>
            {where === "public" && (
              <>
                <div className="field">
                  <label
                    className="label"
                    htmlFor="ev-addr"
                  >
                    {t("admin.col.address")}
                  </label>
                  <input
                    className="input"
                    id="ev-addr"
                    list="cwa-addresses"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <AddressDatalist />
                {address.trim() && (
                  <MapEmbed
                    address={address}
                    small
                  />
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    if (address.trim()) setStep(1);
                  }}
                >
                  {t("common.next")}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <h4 className="h2 mb-4">{t("admin.ev.wWhen")}</h4>
          <div className="flex flex-col gap-4">
            <div className="field">
              <label
                className="label"
                htmlFor="ev-date"
              >
                {t("common.date")}
              </label>
              <input
                type="date"
                className="input"
                id="ev-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label
                className="label"
                htmlFor="ev-time"
              >
                {t("admin.ev.startTime")}
              </label>
              <select
                className="select"
                id="ev-time"
                value={timeVal}
                onChange={(e) => setTime(e.target.value)}
              >
                {timeSlots.map((v) => (
                  <option
                    key={v}
                    value={v}
                  >
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <span className="label">{t("common.duration")}</span>
              <div className="flex flex-wrap gap-2">
                {[90, 120, 180].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={cn("chip", durationMin === n && "active")}
                    onClick={() => setDurationMin(n)}
                  >
                    {n} {t("common.min")}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label">{t("admin.ev.trishawsLabel")}</span>
              {db.trishaws.map((tw) => {
                const checked = trishaws.includes(tw.id);
                return (
                  <label
                    key={tw.id}
                    className={cn("check-row", checked && "checked")}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setTrishaws(
                          e.target.checked
                            ? [...trishaws, tw.id]
                            : trishaws.filter((x) => x !== tw.id),
                        )
                      }
                    />
                    <span>
                      {tw.number} · {tw.model}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="field">
              <span className="label">{t("admin.ev.slotLen")}</span>
              <div className="flex flex-wrap gap-2">
                {[30, 45].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={cn("chip", slotMin === n && "active")}
                    onClick={() => setSlotMin(n)}
                  >
                    {n} {t("common.min")}
                  </button>
                ))}
              </div>
            </div>
            {preview}
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(0)}
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (trishaws.length) setStep(2);
                }}
              >
                {t("common.next")}
              </button>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h4 className="h2 mb-4">{t("admin.ev.wReview")}</h4>
          <div className="card flex flex-col gap-4">
            <div className="detail-list">
              <div>
                <dt className="muted">{t("common.pickup")}</dt>
                <dd>{placeName}</dd>
              </div>
              {where === "public" && (
                <div>
                  <dt className="muted">{t("admin.ev.publicLoc")}</dt>
                  <dd>{t("common.yes")}</dd>
                </div>
              )}
              <div>
                <dt className="muted">{t("admin.col.when")}</dt>
                <dd>{fmt.dayTime(tsFrom(date, "exact", timeVal, ch))}</dd>
              </div>
              <div>
                <dt className="muted">{t("common.duration")}</dt>
                <dd>
                  {durationMin} {t("common.min")}
                </dd>
              </div>
              <div>
                <dt className="muted">{t("common.trishaw")}</dt>
                <dd>
                  {trishaws
                    .map((id) => find(db.trishaws, id)?.number || id)
                    .join(", ")}
                </dd>
              </div>
              <div>
                <dt className="muted">{t("admin.col.slots")}</dt>
                <dd className="tabular-nums">
                  {t("admin.ev.slotsN", {
                    n: slotTimes.length * trishaws.length,
                  })}
                </dd>
              </div>
            </div>
            <MapEmbed
              address={place}
              small
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setStep(1)}
            >
              {t("common.back")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={create}
            >
              <Icon name="sparkles" />
              {t("admin.ev.create")}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function PreviewRow({ tm, n }: { tm: string; n: number }) {
  return (
    <>
      <div className="roster-time">{tm}</div>
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          className="roster-cell"
        >
          —
        </div>
      ))}
    </>
  );
}
