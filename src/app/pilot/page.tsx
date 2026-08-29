"use client";

/* Pilot home: training gate → next ride hero → open rides → impact → week →
   chapter events → community story → home garage. */

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { HeroHead, SectionHead } from "@/components/chrome";
import {
  Avatar,
  BtnHero,
  Ring,
  TypeBadge,
  WeatherChip,
  rev,
} from "@/components/bits";
import { MapEmbed } from "@/components/MapEmbed";
import { Icon } from "@/components/Icon";
import { usePilot } from "./pilot-context";
import { OpenCard, PilotEventCard, StoryCard } from "./cards";
import {
  cleared,
  dayStart,
  firstName,
  isMine,
  myUpcoming,
  openRides,
  pilotStats,
  rideName,
  trainingProgress,
  weekDays,
} from "./lib";

export default function PilotHome() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const { pilotId, bell } = usePilot();

  const p = find(db.pilots, pilotId);
  if (!p) return null;

  const chapter = find(db.chapters, p.chapterId);
  const garage = db.garages[0]; // garages carry no chapterId in the seed — first one is the München home base
  const open = openRides(db, pilotId);
  // eslint-disable-next-line react-hooks/purity -- live "now" read, intentional in this ported mock (SOURCE downgrades this rule repo-wide)
  const urgent = open.filter((r) => r.ts < Date.now() + 4 * 36e5);
  const mine = myUpcoming(db, pilotId);
  const next = mine[0];
  const stats = pilotStats(db, pilotId);
  const events = db.rides
    // eslint-disable-next-line react-hooks/purity -- live "now" read, intentional in this ported mock (SOURCE downgrades this rule repo-wide)
    .filter(
      (r) =>
        r.type === "event" &&
        r.chapterId === "muc" &&
        r.ts > Date.now() &&
        r.status !== "cancelled" &&
        r.status !== "done",
    )
    .sort((a, b) => a.ts - b.ts);
  const tp = trainingProgress(db, pilotId);
  const isCleared = cleared(db, pilotId);
  const h = new Date().getHours();
  const greetKey =
    h < 12
      ? "pilot.greetMorning"
      : h < 18
        ? "pilot.greetAfternoon"
        : "pilot.greetEvening";

  const days = weekDays(0);
  // eslint-disable-next-line react-hooks/purity -- live "now" read, intentional in this ported mock (SOURCE downgrades this rule repo-wide)
  const today = dayStart(Date.now());

  function toggleAvail(dayInt: number) {
    update((d) => {
      const p2 = find(d.pilots, pilotId)!;
      if (!p2.availability) p2.availability = [];
      const i = p2.availability.indexOf(dayInt);
      if (i === -1) p2.availability.push(dayInt);
      else p2.availability.splice(i, 1);
      p2.availability.sort((a, b) => a - b);
    });
  }

  let i = 0;

  return (
    <>
      <HeroHead
        lead={
          <Avatar
            name={p.name}
            size="lg"
          />
        }
        title={t(greetKey, { name: firstName(p.name) })}
        // eslint-disable-next-line react-hooks/purity -- live "now" read, intentional in this ported mock (SOURCE downgrades this rule repo-wide)
        sub={fmt.dateLong(Date.now())}
        right={bell}
      />
      <div className="app-body gap-6">
        {/* blocking first: training is the gate to everything else */}
        {!isCleared && (
          <button
            type="button"
            className="tile tile-red flex items-center gap-4 reveal"
            style={{ ["--i" as string]: i++ }}
            onClick={() => router.push("/pilot/training")}
          >
            <Ring
              pct={tp.pct}
              label={`${tp.pct}%`}
              tone="red"
            />
            <span className="flex-1 text-left">
              <span
                className="tile-value block"
                style={{ fontSize: "1.25rem" }}
              >
                {t("pilot.trainingBlock")}
              </span>
              <span className="tile-label">
                {t("pilot.trainingBlockSub", {
                  done: fmt.num(tp.done),
                  total: fmt.num(tp.total),
                })}
              </span>
            </span>
            <span
              className="btn-hero-knob"
              style={{ background: "rgb(0 0 0 / 0.08)" }}
            >
              <Icon name="chevronRight" />
            </span>
          </button>
        )}

        {/* the hero: what is happening for me next */}
        {next ? (
          <>
            <button
              type="button"
              className="tile tile-ink flex flex-col gap-2 reveal"
              style={{ ["--i" as string]: i++ }}
              onClick={() => router.push(`/pilot/rides/${next.id}`)}
            >
              <span className="flex w-full items-center justify-between">
                <span
                  className="eyebrow"
                  style={{ color: "inherit", opacity: 0.7 }}
                >
                  {t("pilot.heroNext")}
                </span>
                <span className="cover-chip">
                  <Icon name="clock" />
                  {fmt.rel(next.ts)}
                </span>
              </span>
              <span className="display display-sm">{fmt.rideWhen(next)}</span>
              <span className="opacity-85">
                {t("pilot.withName", { name: rideName(next, db) })} ·{" "}
                {next.pickup}
              </span>
              <span className="mt-2 flex w-full items-center justify-between">
                <TypeBadge type={next.type} />
                <span className="btn-hero-knob">
                  <Icon name="chevronRight" />
                </span>
              </span>
            </button>
            {next.status === "staffed" && (
              <div {...rev(i++)}>
                <BtnHero
                  label={t("pilot.checkin")}
                  sub={fmt.rideWhen(next)}
                  icon="check"
                  onClick={() => router.push(`/pilot/rides/${next.id}/checkin`)}
                />
              </div>
            )}
            {next.status === "in_progress" && (
              <div {...rev(i++)}>
                <BtnHero
                  label={t("pilot.finish")}
                  icon="checkCheck"
                  onClick={() => router.push(`/pilot/rides/${next.id}/debrief`)}
                />
              </div>
            )}
          </>
        ) : open.length ? (
          <>
            <div
              className="tile tile-mint-solid flex flex-col gap-2 reveal"
              style={{ ["--i" as string]: i++ }}
            >
              <div className="display display-sm">
                {t("pilot.heroWaiting", { n: fmt.num(open.length) })}
              </div>
              <div className="tile-label">{t("pilot.heroWaitingSub")}</div>
              <div className="tile-glyph">
                <Icon name="bike" />
              </div>
            </div>
            <div {...rev(i++)}>
              <BtnHero
                tone="ink"
                label={t("pilot.openTitle")}
                sub={t("pilot.heroWaitingSub")}
                onClick={() => router.push("/pilot/rides")}
              />
            </div>
          </>
        ) : (
          <div
            className="tile tile-mint flex flex-col gap-2 reveal"
            style={{ ["--i" as string]: i++ }}
          >
            <div className="display display-sm">{t("pilot.heroNothing")}</div>
            <div className="tile-label">{t("pilot.heroNothingSub")}</div>
            <div className="tile-glyph">
              <Icon name="sun" />
            </div>
          </div>
        )}

        {/* rides that need someone — the heart of this app */}
        {open.length > 0 && (
          <div
            className="flex flex-col gap-3 reveal"
            style={{ ["--i" as string]: i++ }}
          >
            <SectionHead
              title={t("pilot.openTitle")}
              linkText={t("common.seeAll")}
              href="/pilot/rides"
            />
            {urgent.length > 0 && (
              <div className="alert alert-red">
                <Icon name="alert" />
                <div>
                  <div className="font-bold">{t("pilot.feed.urgent")}</div>
                  <div>{t("pilot.feed.urgentSub")}</div>
                </div>
              </div>
            )}
            {open.slice(0, 2).map((r) => (
              <OpenCard
                key={r.id}
                ride={r}
                db={db}
                urgent={urgent.includes(r)}
              />
            ))}
          </div>
        )}

        {/* what I have given so far */}
        <div
          className="tile-grid-3 reveal"
          style={{ ["--i" as string]: i++ }}
        >
          <div className="tile tile-mint">
            <div className="tile-value">{fmt.num(stats.rides)}</div>
            <div className="tile-label">{t("pilot.statRides")}</div>
          </div>
          <div className="tile tile-grey">
            <div className="tile-value">{fmt.num(stats.hours)}</div>
            <div className="tile-label">{t("pilot.statHours")}</div>
          </div>
          <div className="tile tile-paper">
            <div
              className="tile-value"
              style={{ fontSize: "1.25rem" }}
            >
              {fmt.euro(stats.donations)}
            </div>
            <div className="tile-label">{t("pilot.statDonations")}</div>
          </div>
        </div>

        {/* my week at a glance — availability doubles as the calendar */}
        <div
          className="flex flex-col gap-3 reveal"
          style={{ ["--i" as string]: i++ }}
        >
          <SectionHead
            title={t("pilot.weekTitle")}
            linkText={t("common.viewWeek")}
            href="/pilot/rides?tab=week"
          />
          <div className="week-strip">
            {days.map((ts) => {
              const dayInt = new Date(ts).getDay();
              const avail = (p.availability || []).includes(dayInt);
              const has = db.rides.some(
                (r) => isMine(r, pilotId) && dayStart(r.ts) === ts,
              );
              return (
                <button
                  key={ts}
                  type="button"
                  className={`${avail ? "active " : ""}${ts === today ? "today" : ""}`}
                  onClick={() => toggleAvail(dayInt)}
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
          <div className="flex items-center justify-between">
            <span className="hint">{t("pilot.weekHint")}</span>
            {/* eslint-disable-next-line react-hooks/purity -- live "now" read, intentional in this ported mock (SOURCE downgrades this rule repo-wide) */}
            <WeatherChip ts={Date.now()} />
          </div>
        </div>

        {/* chapter life */}
        {events.length > 0 && (
          <div
            className="flex flex-col gap-3 reveal"
            style={{ ["--i" as string]: i++ }}
          >
            <SectionHead title={t("pilot.eventsTitle")} />
            <div className="rail">
              {events.slice(0, 4).map((r) => (
                <PilotEventCard
                  key={r.id}
                  ride={r}
                  db={db}
                />
              ))}
            </div>
          </div>
        )}

        <div {...rev(i++)}>
          <StoryCard db={db} />
        </div>

        {/* where the trishaws live */}
        {garage && (
          <div
            className="card flex flex-col gap-3 reveal"
            style={{ ["--i" as string]: i++ }}
          >
            <div className="eyebrow">{t("pilot.garageTitle")}</div>
            <div className="flex items-center gap-3.5">
              <span className="icon-tile on-grey">
                <Icon name="warehouse" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="h2 block">{garage.name}</span>
                <span className="text-sm muted">{garage.address}</span>
              </span>
            </div>
            <MapEmbed
              address={garage.address}
              small
              caption={false}
            />
            {chapter?.phone && (
              <a
                className="btn btn-outline btn-block"
                href={`tel:${chapter.phone.replace(/\s+/g, "")}`}
              >
                <Icon name="phone" />
                {chapter.phone}
              </a>
            )}
          </div>
        )}
      </div>
    </>
  );
}
