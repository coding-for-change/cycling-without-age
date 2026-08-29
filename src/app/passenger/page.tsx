"use client";

/* Home — built around the next ride: greeting, the one thing that matters now,
   the red book CTA, a quiet sense of scale, upcoming events, and a human being
   one tap away. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { isActiveRide } from "@/lib/selectors";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { HeroHead, SectionHead } from "@/components/chrome";
import { Avatar, BtnHero, WeatherChip, rev } from "@/components/bits";
import { usePassenger, WA_KEY } from "./session";
import { PaxEventCard, PaxBell, myEvents } from "./parts";

export default function PassengerHome() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const session = usePassenger();
  const [waOpen, setWaOpen] = useState(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (localStorage.getItem(WA_KEY)) return;
    localStorage.setItem(WA_KEY, "1");
    const timer = setTimeout(() => setWaOpen(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const client = find(db.clients, session.userId)!;
  const chapter = find(db.chapters, "muc")!;
  const h = new Date(now).getHours();
  const greetKey =
    h < 12
      ? "pax.goodMorning"
      : h < 18
        ? "pax.goodAfternoon"
        : "pax.goodEvening";

  const mine = db.rides.filter((r) => r.clientId === session.userId);
  const next = mine
    .filter((r) => isActiveRide(r) && r.ts > now - 2 * 36e5)
    .sort((a, b) => a.ts - b.ts)[0];
  const pilot = next?.pilotId ? find(db.pilots, next.pilotId) : undefined;
  const done = mine.filter((r) => r.status === "done");
  const hours = Math.round(
    done.reduce((s2, r) => s2 + (r.durationMin || 60), 0) / 60,
  );
  const events = myEvents(db, client);
  const monthAgo = now - 30 * 864e5;
  const pulse = db.rides.filter(
    (r) => r.chapterId === "muc" && r.status === "done" && r.ts > monthAgo,
  ).length;

  let i = 0;

  return (
    <>
      <HeroHead
        lead={
          <Avatar
            name={client.name}
            size="lg"
          />
        }
        title={t(greetKey, { name: client.name.split(" ")[0] })}
        sub={fmt.dateLong(now)}
        right={<PaxBell />}
      />
      <div className="app-body gap-5">
        {/* — the one thing that matters right now — */}
        {next ? (
          <div {...rev(i++)}>
            <button
              type="button"
              className="tile tile-ink flex w-full flex-col gap-2 text-left"
              onClick={() => router.push(`/passenger/rides/${next.id}`)}
            >
              <span className="flex w-full items-center justify-between gap-3">
                <span
                  className="eyebrow"
                  style={{ color: "inherit", opacity: 0.7 }}
                >
                  {t("pax.nextRide")}
                </span>
                <span className="cover-chip">
                  <Icon name="clock" />
                  {fmt.rel(next.ts)}
                </span>
              </span>
              <span className="display display-sm">{fmt.rideWhen(next)}</span>
              <span style={{ opacity: 0.85 }}>
                {pilot
                  ? t("pax.pilotPicksYou", {
                      name: pilot.name.split(" ")[0],
                      place: next.pickup,
                    })
                  : t("pax.pickupAt", { place: next.pickup })}
              </span>
              <span className="mt-2 flex w-full items-center justify-between gap-3">
                {pilot ? (
                  <span className="flex items-center gap-2">
                    <Avatar name={pilot.name} />
                    <span className="font-semibold">{pilot.name}</span>
                  </span>
                ) : (
                  <span className="cover-chip">
                    <Icon name="search" />
                    {t("pax.lookingPilot")}
                  </span>
                )}
                <span className="btn-hero-knob">
                  <Icon name="chevronRight" />
                </span>
              </span>
            </button>
          </div>
        ) : (
          <div {...rev(i++)}>
            <div className="tile tile-mint flex flex-col gap-2">
              <div className="display display-sm">{t("pax.heroNoRide")}</div>
              <div className="tile-label">{t("pax.heroNoRideSub")}</div>
              <div className="tile-glyph">
                <Icon name="bike" />
              </div>
            </div>
          </div>
        )}

        <div {...rev(i++)}>
          <BtnHero
            label={t("pax.bookRide")}
            sub={t("pax.bookSub")}
            icon="bike"
            tone={next ? "ink" : undefined}
            onClick={() => router.push("/passenger/book")}
          />
        </div>

        {/* — a quiet, honest sense of scale — */}
        <div
          className="tile-grid reveal"
          style={{ ["--i" as string]: i++ }}
        >
          {done.length ? (
            <>
              <div className="tile tile-mint">
                <div className="tile-value">{fmt.num(done.length)}</div>
                <div className="tile-label">{t("pax.statRides")}</div>
                <div className="tile-glyph">
                  <Icon name="bike" />
                </div>
              </div>
              <div className="tile tile-grey">
                <div className="tile-value">{fmt.num(hours)}</div>
                <div className="tile-label">{t("pax.statHours")}</div>
                <div className="tile-glyph">
                  <Icon name="sun" />
                </div>
              </div>
            </>
          ) : (
            <div
              className="tile tile-mint"
              style={{ gridColumn: "span 2" }}
            >
              <div
                className="tile-value"
                style={{ fontSize: "1.25rem" }}
              >
                {t("pax.statFirst")}
              </div>
              <div className="tile-label">{t("pax.statFirstSub")}</div>
              <div className="tile-glyph">
                <Icon name="heart" />
              </div>
            </div>
          )}
        </div>

        <div {...rev(i++)}>
          <div className="tile tile-paper flex items-center gap-3">
            <span className="icon-tile on-red">
              <Icon name="users" />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="tile-value block"
                style={{ fontSize: "1.375rem" }}
              >
                {fmt.num(pulse)}
              </span>
              <span className="tile-label block">{t("pax.chapterPulse")}</span>
            </span>
            <WeatherChip ts={now} />
          </div>
        </div>

        {/* — what is coming up — */}
        {events.length > 0 && (
          <div
            className="reveal flex flex-col gap-3"
            style={{ ["--i" as string]: i++ }}
          >
            <SectionHead
              title={t("pax.eventsTitle")}
              linkText={t("pax.allEvents")}
              href="/passenger/events"
            />
            <div className="rail">
              {events.slice(0, 4).map((r) => (
                <PaxEventCard
                  key={r.id}
                  ride={r}
                  db={db}
                />
              ))}
            </div>
          </div>
        )}

        {/* — a human being, one tap away — */}
        <div {...rev(i++)}>
          <div className="card flex flex-col gap-3">
            <div className="flex items-center gap-3.5">
              <span className="icon-tile on-grey">
                <Icon name="phone" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="h2 block">{t("pax.needHelp")}</span>
                <span className="muted block text-sm">{t("pax.helpText")}</span>
              </span>
            </div>
            <a
              className="btn btn-outline btn-xl btn-block"
              href={`tel:${chapter.phone?.replace(/\s+/g, "")}`}
            >
              <Icon name="phone" />
              {chapter.phone}
            </a>
          </div>
        </div>
      </div>

      <Modal
        open={waOpen}
        onClose={() => setWaOpen(false)}
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3.5">
            <span className="icon-tile on-mint">
              <Icon name="whatsapp" />
            </span>
            <div className="h2">{t("pax.wa.title")}</div>
          </div>
          <p>{t("pax.wa.body")}</p>
          <Link
            className="btn btn-primary btn-xl btn-block"
            href="/whatsapp"
          >
            <Icon name="whatsapp" />
            {t("pax.wa.try")}
          </Link>
          <button
            type="button"
            className="btn btn-outline btn-xl btn-block"
            onClick={() => setWaOpen(false)}
          >
            {t("pax.wa.keep")}
          </button>
        </div>
      </Modal>
    </>
  );
}
