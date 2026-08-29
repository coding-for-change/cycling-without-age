"use client";

/* Check-in: three quick taps before you roll, walk-up passengers with an
   on-the-spot waiver, then the ride goes in_progress. */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { toast } from "@/lib/ui";
import { Hero } from "@/lib/art";
import { BackHead } from "@/components/chrome";
import { BtnHero } from "@/components/bits";
import { Icon } from "@/components/Icon";

export default function CheckinPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, fmt } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);

  const [checks, setChecks] = useState([false, false, false]);
  const [wOpen, setWOpen] = useState(false);
  const [wName, setWName] = useState("");
  const [wWaiver, setWWaiver] = useState(false);
  const startedAt = useRef<number | null>(null); // elapsed time kept in-memory only

  const ride = find(db.rides, id);
  const wrongState =
    !!ride && ride.status !== "staffed" && ride.status !== "in_progress";
  useEffect(() => {
    if (wrongState) router.replace(`/pilot/rides/${id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrongState]);

  if (!ride) return <BackHead back="/pilot/rides" />;

  /* already rolling → the on-road screen */
  if (ride.status === "in_progress") {
    return (
      <>
        <BackHead
          back={`/pilot/rides/${id}`}
          title={t("pilot.check.title")}
          sub={fmt.rideWhen(ride)}
        />
        <div className="app-body gap-6">
          <div className="mx-auto w-[min(20rem,90%)]">
            <Hero
              name="trishaw"
              className="roll"
            />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="display">{t("pilot.check.onRoad")}</div>
            <p className="muted">{t("pilot.check.onRoadSub")}</p>
            {/* eslint-disable-next-line react-hooks/refs -- read-once elapsed-time snapshot, intentional in this ported mock (SOURCE downgrades this rule repo-wide) */}
            <div className="text-xs muted">
              {t("pilot.check.elapsed", {
                t: fmt.rel(startedAt.current || ride.ts),
              })}
            </div>
          </div>
          <BtnHero
            label={t("pilot.finish")}
            icon="checkCheck"
            onClick={() => router.push(`/pilot/rides/${id}/debrief`)}
          />
        </div>
      </>
    );
  }
  if (ride.status !== "staffed") return null;

  const doneCount = checks.filter(Boolean).length;
  const allChecked = doneCount === 3;

  function toggle(i: number, v: boolean) {
    setChecks((prev) => prev.map((c, k) => (k === i ? v : c)));
  }

  function addWalkUp() {
    const name = wName.trim();
    if (!name || !wWaiver) return;
    setWOpen(false);
    setWName("");
    setWWaiver(false);
    update((d) => {
      const r2 = find(d.rides, id)!;
      const rr = r2 as typeof r2 & {
        walkUps?: { name: string; waiverSigned: boolean }[];
      };
      if (!rr.walkUps) rr.walkUps = [];
      rr.walkUps.push({ name, waiverSigned: true });
    });
    toast(t("pilot.check.walkupAdded"));
  }

  function start() {
    if (!allChecked) return;
    startedAt.current = Date.now();
    update((d) => {
      find(d.rides, id)!.status = "in_progress";
    });
    toast(t("pilot.check.started"));
  }

  const walkUps =
    (ride as typeof ride & { walkUps?: { name: string }[] }).walkUps || [];

  return (
    <>
      <BackHead
        back={`/pilot/rides/${id}`}
        title={t("pilot.check.title")}
        sub={fmt.rideWhen(ride)}
      />
      <div className="app-body gap-6">
        <div className="reveal flex flex-col gap-2">
          <div className="display display-sm">{t("pilot.check.lead")}</div>
          <div className="bar-track">
            <span
              className="bar-fill on-mint"
              style={{ width: `${Math.round((doneCount / 3) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {(
            ["pilot.check.c1", "pilot.check.c2", "pilot.check.c3"] as const
          ).map((key, i) => (
            <label
              key={key}
              className={`check-row${checks[i] ? " checked" : ""}`}
            >
              <input
                type="checkbox"
                checked={checks[i]}
                onChange={(e) => toggle(i, e.target.checked)}
              />
              <span className="font-semibold">{t(key)}</span>
            </label>
          ))}
        </div>

        {/* walk-up passengers */}
        <div className="flex flex-col gap-3">
          {walkUps.map((w) => (
            <div
              key={w.name}
              className="flex items-center gap-2 text-sm muted"
            >
              <Icon
                name="check"
                size={15}
              />
              {w.name} · {t("common.waiver")}: {t("common.signed")}
            </div>
          ))}
          {!wOpen ? (
            <button
              type="button"
              className="btn btn-outline btn-block"
              onClick={() => setWOpen(true)}
            >
              <Icon name="plus" />
              {t("pilot.check.walkup")}
            </button>
          ) : (
            <div className="card flex flex-col gap-3">
              <div className="field">
                <label
                  className="label"
                  htmlFor="wu-name"
                >
                  {t("pilot.check.walkupName")}
                </label>
                <input
                  id="wu-name"
                  className="input"
                  value={wName}
                  onChange={(e) => setWName(e.target.value)}
                />
              </div>
              <label className={`check-row${wWaiver ? " checked" : ""}`}>
                <input
                  type="checkbox"
                  checked={wWaiver}
                  onChange={(e) => setWWaiver(e.target.checked)}
                />
                <span className="text-sm">{t("waiver.text")}</span>
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                disabled={!(wWaiver && wName.trim())}
                onClick={addWalkUp}
              >
                {t("common.add")}
              </button>
            </div>
          )}
        </div>

        <BtnHero
          label={t("pilot.check.start")}
          icon="bike"
          disabled={!allChecked}
          onClick={start}
        />
      </div>
    </>
  );
}
