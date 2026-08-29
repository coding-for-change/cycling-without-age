"use client";

/* Ride detail: status timeline, your pilot (call + late-cancel note), chat
   entry, the booking facts, the pickup map, and cancellation. */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { isActiveRide } from "@/lib/selectors";
import { Icon } from "@/components/Icon";
import { BackHead } from "@/components/chrome";
import { Avatar, BtnHero, StatusBadge, TypeBadge } from "@/components/bits";
import { MapEmbed } from "@/components/MapEmbed";
import { usePassenger } from "../../session";
import { CancelRideDialog, NotFoundState, Timeline } from "../../parts";

export default function RideDetailPage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const db = useStore((s) => s.db)!;
  usePassenger();
  const [cancelOpen, setCancelOpen] = useState(false);

  const ride = find(db.rides, id);
  const isEvent = ride?.type === "event";

  useEffect(() => {
    if (isEvent) router.replace(`/passenger/events/${id}`);
  }, [isEvent, id, router]);

  if (!ride) return <NotFoundState msg={t("pax.rideGone")} />;
  if (isEvent) return null;

  const pilot = ride.pilotId ? find(db.pilots, ride.pilotId) : undefined;
  const staffedLike =
    ride.status === "staffed" || ride.status === "in_progress";

  const rows: [string, string][] = [[t("common.pickup"), ride.pickup]];
  if (ride.destination) rows.push([t("common.destination"), ride.destination]);
  (ride.stops || []).forEach((sp, i) =>
    rows.push([`${t("common.stop")} ${i + 1}`, sp]),
  );
  if (ride.type === "functional")
    rows.push([
      t("common.return"),
      t(ride.returnRide ? "common.yes" : "common.no"),
    ]);
  rows.push([t("common.duration"), `${ride.durationMin} ${t("common.min")}`]);
  if (ride.notes) rows.push([t("common.notes"), ride.notes]);

  return (
    <>
      <BackHead
        back="/passenger/rides"
        title={t(`type.${ride.type}`)}
      />
      <div className="app-body gap-5">
        <div className="reveal flex flex-col gap-2">
          <div className="display display-sm">{fmt.rideWhen(ride)}</div>
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={ride.type} />
            <StatusBadge status={ride.status} />
            {isActiveRide(ride) && (
              <span className="badge badge-outline">
                <Icon name="clock" />
                {fmt.rel(ride.ts)}
              </span>
            )}
          </div>
        </div>

        {ride.status === "cancelled" ? (
          <div className="alert alert-grey">
            <Icon name="info" />
            <div>{t("pax.cancelledInfo")}</div>
          </div>
        ) : (
          <div
            className="card reveal"
            style={{ ["--i" as string]: 1 }}
          >
            <Timeline ride={ride} />
          </div>
        )}

        {pilot && (staffedLike || ride.status === "done") && (
          <div
            className="tile tile-mint reveal flex flex-col gap-3"
            style={{ ["--i" as string]: 2 }}
          >
            <div className="flex items-center gap-3.5">
              <Avatar
                name={pilot.name}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="tile-label">{t("pax.yourPilot")}</div>
                <div
                  className="tile-value"
                  style={{ fontSize: "1.375rem" }}
                >
                  {pilot.name}
                </div>
              </div>
            </div>
            <a
              className="btn btn-outline btn-xl btn-block"
              href={`tel:${pilot.phone.replace(/\s+/g, "")}`}
            >
              <Icon name="phone" />
              {pilot.phone}
            </a>
            <div className="tile-foot text-center">
              {t("pax.lateCancelNote")}
            </div>
          </div>
        )}

        {staffedLike && (
          <div
            className="reveal"
            style={{ ["--i" as string]: 3 }}
          >
            <BtnHero
              label={t("common.chat")}
              icon="chat"
              tone="ink"
              onClick={() => router.push(`/passenger/chats/${ride.id}`)}
            />
          </div>
        )}

        <div
          className="card reveal"
          style={{ ["--i" as string]: 4 }}
        >
          <dl className="detail-list">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="muted">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div
          className="reveal flex flex-col gap-2"
          style={{ ["--i" as string]: 5 }}
        >
          <h2 className="h2">{t("common.location")}</h2>
          <MapEmbed
            address={ride.pickup}
            small
          />
        </div>

        {isActiveRide(ride) && (
          <button
            type="button"
            className="btn btn-destructive-outline btn-xl btn-block"
            onClick={() => setCancelOpen(true)}
          >
            <Icon name="x" />
            {t("pax.cancelRide")}
          </button>
        )}
      </div>
      <CancelRideDialog
        rideId={ride.id}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
      />
    </>
  );
}
