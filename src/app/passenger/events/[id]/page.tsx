"use client";

/* Event detail: tall cover art, the facts as tiles, about, location map,
   who is coming, your pilots on the day, and the reserve/cancel-seat actions. */

import { useState } from "react";
import { useParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import {
  eventBody,
  eventSeats,
  eventTitle,
  rosterNames,
} from "@/lib/selectors";
import type { Pilot } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { BackHead } from "@/components/chrome";
import { Avatar, AvatarStack, BtnHero } from "@/components/bits";
import { EventCover, CoverChip, SeatStrip } from "@/components/events";
import { MapEmbed } from "@/components/MapEmbed";
import { usePassenger } from "../../session";
import { NotFoundState, onList, useSeatActions } from "../../parts";

export default function EventDetailPage() {
  const { t, fmt } = useI18n();
  const { id } = useParams<{ id: string }>();
  const db = useStore((s) => s.db)!;
  const session = usePassenger();
  const { reserveSeat, cancelSeat } = useSeatActions();
  const [cancelOpen, setCancelOpen] = useState(false);

  const r = find(db.rides, id);
  if (!r || r.type !== "event")
    return <NotFoundState msg={t("pax.eventGone")} />;

  const seats = eventSeats(r);
  const mine = onList(r, session.name);
  const partner = r.partnerId ? find(db.partners, r.partnerId) : undefined;
  const chapter = find(db.chapters, r.chapterId || "muc")!;
  const guests = rosterNames(r.roster);
  const pilots: Pilot[] = [];
  for (const k of Object.keys(r.pilots || {})) {
    const pid = r.pilots![k];
    if (pid) {
      const p = find(db.pilots, pid);
      if (p) pilots.push(p);
    }
  }

  return (
    <>
      <BackHead back="/passenger/events" />
      <div className="app-body gap-5">
        <div className="reveal">
          <EventCover
            ride={r}
            tall
            date={false}
            chips={
              <CoverChip
                label={t("common.event")}
                icon="sparkles"
              />
            }
          />
        </div>

        <div
          className="reveal flex flex-col gap-2"
          style={{ ["--i" as string]: 1 }}
        >
          <div className="display">{eventTitle(r, db)}</div>
          <div className="flex flex-wrap items-center gap-3 muted">
            <span className="flex items-center gap-1.5">
              <Icon
                name="calendar"
                size={16}
              />
              {fmt.dateLong(r.ts)}
            </span>
            <span className="flex items-center gap-1.5">
              <Icon
                name="clock"
                size={16}
              />
              {fmt.time(r.ts)}
            </span>
          </div>
        </div>

        <div
          className="tile-grid reveal"
          style={{ ["--i" as string]: 2 }}
        >
          <div className="tile tile-grey">
            <div className="tile-label">{t("common.duration")}</div>
            <div className="tile-value">
              {fmt.num(r.durationMin)}
              <span style={{ fontSize: "1rem" }}> {t("common.min")}</span>
            </div>
            <div className="tile-glyph">
              <Icon name="clock" />
            </div>
          </div>
          <div className="tile tile-mint">
            <div className="tile-label">{t("common.seats")}</div>
            <div className="tile-value">
              {seats.free}
              <span style={{ fontSize: "1rem" }}>/{seats.total}</span>
            </div>
            <div className="tile-glyph">
              <Icon name="armchair" />
            </div>
          </div>
        </div>

        {eventBody(r) && (
          <div
            className="reveal flex flex-col gap-2"
            style={{ ["--i" as string]: 3 }}
          >
            <h2 className="h2">{t("common.about")}</h2>
            <p>{eventBody(r)}</p>
            <div className="flex items-center gap-2 text-sm muted">
              <Icon
                name="gift"
                size={15}
              />
              {t("common.freeOfCharge")}
            </div>
          </div>
        )}

        <div
          className="reveal flex flex-col gap-2"
          style={{ ["--i" as string]: 4 }}
        >
          <h2 className="h2">{t("common.location")}</h2>
          <div className="font-semibold">{r.location || r.pickup}</div>
          <MapEmbed
            address={r.location || r.pickup}
            caption={false}
          />
          {partner && (
            <div className="flex items-center gap-2 text-sm muted">
              <Icon
                name="building"
                size={15}
              />
              {t("common.hostedBy", { name: partner.name })}
            </div>
          )}
        </div>

        <div
          className="reveal flex flex-col gap-2"
          style={{ ["--i" as string]: 5 }}
        >
          <h2 className="h2">{t("common.whoIsComing")}</h2>
          {guests.length > 0 && (
            <div className="flex items-center gap-3">
              <AvatarStack
                names={guests}
                max={5}
              />
              <span className="text-sm muted">
                {t("pax.seatsFree", { free: seats.free, total: seats.total })}
              </span>
            </div>
          )}
          <SeatStrip
            ride={r}
            myName={session.name}
          />
        </div>

        {pilots.length > 0 && (
          <div
            className="card reveal flex flex-col gap-3"
            style={{ ["--i" as string]: 6 }}
          >
            <div className="eyebrow">{t("pax.eventPilots")}</div>
            {pilots.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2"
              >
                <Avatar name={p.name} />
                <span className="flex-1 font-semibold">{p.name}</span>
                <span className="badge badge-mint">
                  <Icon name="shield" />
                  {t("common.pilot")}
                </span>
              </div>
            ))}
          </div>
        )}

        <div
          className="reveal flex flex-col gap-3"
          style={{ ["--i" as string]: 7 }}
        >
          {mine ? (
            <div className="tile tile-mint flex items-center gap-3">
              <span className="icon-tile on-ink">
                <Icon name="check" />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="tile-value block"
                  style={{ fontSize: "1.125rem" }}
                >
                  {t("pax.eventReserved")}
                </span>
                <span className="tile-label block">
                  {fmt.dateLong(r.ts)} · {fmt.time(r.ts)}
                </span>
              </span>
            </div>
          ) : seats.free ? (
            <BtnHero
              label={t("pax.reserveSeat")}
              sub={t("pax.seatsFree", { free: seats.free, total: seats.total })}
              icon="armchair"
              onClick={() => reserveSeat(r.id)}
            />
          ) : (
            <div className="alert alert-grey">
              <Icon name="info" />
              <div>{t("pax.eventFull")}</div>
            </div>
          )}
          {mine && (
            <button
              type="button"
              className="btn btn-destructive-outline btn-xl btn-block"
              onClick={() => setCancelOpen(true)}
            >
              <Icon name="x" />
              {t("pax.cancelSeat")}
            </button>
          )}
          <a
            className="btn btn-outline btn-lg btn-block"
            href={`tel:${chapter.phone?.replace(/\s+/g, "")}`}
          >
            <Icon name="phone" />
            {t("common.help")}
          </a>
        </div>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
      >
        <div className="flex flex-col gap-5">
          <div className="display display-sm">{t("pax.cancelSeatQ")}</div>
          <button
            type="button"
            className="btn btn-primary btn-xl btn-block"
            onClick={() => {
              cancelSeat(r.id);
              setCancelOpen(false);
            }}
          >
            {t("pax.cancelSeatYes")}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-xl btn-block"
            onClick={() => setCancelOpen(false)}
          >
            {t("pax.keepSeat")}
          </button>
        </div>
      </Modal>
    </>
  );
}
