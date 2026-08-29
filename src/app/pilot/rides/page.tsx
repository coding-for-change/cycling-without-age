"use client";

/* Rides: open feed / my rides / week calendar — one screen, three segments. */

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import {
  HeroHead,
  BrandDot,
  SectionHead,
  EmptyState,
} from "@/components/chrome";
import { Icon } from "@/components/Icon";
import { usePilot } from "../pilot-context";
import { OpenCard, MineCard } from "../cards";
import {
  byTs,
  dayStart,
  isMine,
  myUpcoming,
  openRides,
  rideName,
  weekDays,
} from "../lib";

type Tab = "open" | "mine" | "week";

function RidesScreen() {
  const { t, fmt } = useI18n();
  const db = useStore((s) => s.db)!;
  const { pilotId, bell } = usePilot();
  const params = useSearchParams();
  const initial = (params.get("tab") as Tab) || "open";
  const [tab, setTab] = useState<Tab>(
    ["open", "mine", "week"].includes(initial) ? initial : "open",
  );
  const [weekOff, setWeekOff] = useState(0);
  const [selIdx, setSelIdx] = useState(-1);
  const [now] = useState(() => Date.now());

  const open = openRides(db, pilotId);
  const mine = myUpcoming(db, pilotId);
  const urgent = open.filter((r) => r.ts < now + 4 * 36e5);
  const past = db.rides
    .filter((r) => r.status === "done" && r.pilotId === pilotId)
    .sort((a, b) => b.ts - a.ts);

  /* week block state */
  const days = weekDays(weekOff);
  const today = dayStart(now);
  let sel = selIdx;
  if (sel < 0) {
    sel = days.indexOf(today);
    if (sel < 0) sel = 0;
  }
  const allMine = db.rides.filter((r) => isMine(r, pilotId));
  const dayList = allMine
    .filter((r) => dayStart(r.ts) === days[sel])
    .sort(byTs);

  return (
    <>
      <HeroHead
        lead={<BrandDot />}
        title={t("pilot.tab.rides")}
        sub={`${t("pilot.openTitle")} · ${open.length}`}
        right={bell}
      />
      <div className="app-body gap-6">
        <div className="seg w-full flex">
          {(["open", "mine", "week"] as Tab[]).map((k) => (
            <button
              key={k}
              type="button"
              className={`flex-1 ${tab === k ? "active" : ""}`}
              onClick={() => {
                setTab(k);
                setSelIdx(-1);
              }}
            >
              {t(`pilot.seg.${k}`)}
            </button>
          ))}
        </div>

        {tab === "open" &&
          (open.length ? (
            <>
              {urgent.length > 0 && (
                <div className="alert alert-red">
                  <Icon name="alert" />
                  <div>
                    <div className="font-bold">{t("pilot.feed.urgent")}</div>
                    <div>{t("pilot.feed.urgentSub")}</div>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3">
                {open.map((r, k) => (
                  <div
                    key={r.id}
                    className="reveal"
                    style={{ ["--i" as string]: k }}
                  >
                    <OpenCard
                      ride={r}
                      db={db}
                      urgent={urgent.includes(r)}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon="bike"
              text={t("pilot.feed.empty")}
            />
          ))}

        {tab === "mine" && (
          <>
            <div className="flex flex-col gap-3">
              <SectionHead title={t("common.upcoming")} />
              {mine.length ? (
                mine.map((r, k) => (
                  <div
                    key={r.id}
                    className="reveal"
                    style={{ ["--i" as string]: k }}
                  >
                    <MineCard
                      ride={r}
                      db={db}
                    />
                  </div>
                ))
              ) : (
                <EmptyState
                  icon="calendar"
                  text={t("pilot.mine.emptyUp")}
                  cta={
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setTab("open")}
                    >
                      {t("pilot.seg.open")}
                    </button>
                  }
                />
              )}
            </div>
            <div className="flex flex-col gap-3">
              <SectionHead title={t("common.past")} />
              {past.length ? (
                past.map((r) => (
                  <div
                    key={r.id}
                    className="record-card flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        {rideName(r, db)}
                      </div>
                      <div className="text-xs muted">{fmt.date(r.ts)}</div>
                    </div>
                    {r.debrief && r.debrief.donation > 0 && (
                      <span className="text-sm font-bold tabular-nums">
                        {fmt.euro(r.debrief.donation)}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm muted">{t("pilot.mine.emptyPast")}</div>
              )}
            </div>
          </>
        )}

        {tab === "week" && (
          <>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="icon-pill"
                  aria-label={t("common.back")}
                  onClick={() => {
                    setWeekOff(weekOff - 1);
                    setSelIdx(-1);
                  }}
                >
                  <Icon name="chevronLeft" />
                </button>
                <div className="font-semibold">
                  {fmt.date(days[0])} – {fmt.date(days[6])}
                </div>
                <button
                  type="button"
                  className="icon-pill"
                  aria-label={t("common.next")}
                  onClick={() => {
                    setWeekOff(weekOff + 1);
                    setSelIdx(-1);
                  }}
                >
                  <Icon name="chevronRight" />
                </button>
              </div>
              <div className="week-strip">
                {days.map((ts, k) => {
                  const has = allMine.some((r) => dayStart(r.ts) === ts);
                  return (
                    <button
                      key={ts}
                      type="button"
                      className={`${k === sel ? "active " : ""}${ts === today ? "today" : ""}`}
                      onClick={() => setSelIdx(k)}
                    >
                      <span>{fmt.weekday(ts)}</span>
                      <span className="dnum">{new Date(ts).getDate()}</span>
                      <span
                        className="ride-dot"
                        style={{ visibility: has ? "visible" : "hidden" }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <SectionHead title={fmt.day(days[sel])} />
              {dayList.length ? (
                dayList.map((r) => (
                  <MineCard
                    key={r.id}
                    ride={r}
                    db={db}
                  />
                ))
              ) : (
                <EmptyState
                  icon="sun"
                  text={t("pilot.mine.dayEmpty")}
                />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function RidesPage() {
  return (
    <Suspense>
      <RidesScreen />
    </Suspense>
  );
}
