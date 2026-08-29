"use client";

/* Post-booking confirmation: celebration art, what happens next, and the exits. */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { Hero } from "@/lib/art";
import { Icon } from "@/components/Icon";
import { BackHead } from "@/components/chrome";
import { BtnHero } from "@/components/bits";
import { CancelRideDialog, NotFoundState } from "../../parts";

export default function BookedPage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const db = useStore((s) => s.db)!;
  const [cancelOpen, setCancelOpen] = useState(false);

  const ride = find(db.rides, id);
  if (!ride) return <NotFoundState msg={t("pax.rideGone")} />;
  const requested = ride.status === "requested";

  const steps: [string, string, string][] = [
    ["search", "pax.next1", "on-grey"],
    ["bell", "pax.next2", "on-grey"],
    ["bike", "pax.next3", "on-mint"],
  ];

  return (
    <>
      <BackHead back="/passenger" />
      <div className="app-body gap-5">
        <div className="reveal mx-auto w-[min(20rem,90%)]">
          <Hero name="celebrate" />
        </div>
        <div
          className="reveal flex flex-col gap-2 text-center"
          style={{ ["--i" as string]: 1 }}
        >
          <div className="display">
            {t(requested ? "pax.requestedTitle" : "pax.bookedTitle")}
          </div>
          <p className="muted">
            {requested ? t("pax.requestedText") : fmt.rideWhen(ride)}
          </p>
        </div>
        {!requested && (
          <div
            className="card reveal flex flex-col gap-3"
            style={{ ["--i" as string]: 2 }}
          >
            <div className="h2">{t("pax.whatNext")}</div>
            {steps.map(([icon, key, tone]) => (
              <div
                key={key}
                className="flex items-center gap-3.5"
              >
                <span className={`icon-tile icon-tile-sm ${tone}`}>
                  <Icon name={icon} />
                </span>
                <span className="flex-1">{t(key)}</span>
              </div>
            ))}
          </div>
        )}
        <div
          className="reveal flex flex-col gap-3"
          style={{ ["--i" as string]: 3 }}
        >
          <BtnHero
            label={t("common.details")}
            onClick={() => router.push(`/passenger/rides/${ride.id}`)}
            tone="ink"
          />
          <button
            type="button"
            className="btn btn-outline btn-xl btn-block"
            onClick={() => router.push("/passenger")}
          >
            {t("pax.backHome")}
          </button>
          <button
            type="button"
            className="p-2 text-center text-sm muted"
            onClick={() => setCancelOpen(true)}
          >
            {t("pax.cancelRide")}
          </button>
        </div>
      </div>
      <CancelRideDialog
        rideId={ride.id}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onCancelled={() => router.push("/passenger/rides")}
      />
    </>
  );
}
