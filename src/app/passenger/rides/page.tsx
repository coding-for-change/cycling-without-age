"use client";

/* My rides — upcoming (rich cards) and past (compact rows). */

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { isActiveRide } from "@/lib/selectors";
import { Icon } from "@/components/Icon";
import {
  HeroHead,
  BrandDot,
  SectionHead,
  EmptyState,
} from "@/components/chrome";
import { Avatar, StatusBadge, TypeBadge } from "@/components/bits";
import { usePassenger } from "../session";

export default function RidesPage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const session = usePassenger();

  const mine = db.rides.filter((r) => r.clientId === session.userId);
  const up = mine.filter(isActiveRide).sort((a, b) => a.ts - b.ts);
  const past = mine.filter((r) => !isActiveRide(r)).sort((a, b) => b.ts - a.ts);

  return (
    <>
      <HeroHead
        lead={<BrandDot />}
        title={t("pax.tab.rides")}
        sub={`${t("common.upcoming")} · ${up.length}`}
        right={
          <button
            type="button"
            className="icon-pill on-ink"
            aria-label={t("pax.bookRide")}
            onClick={() => router.push("/passenger/book")}
          >
            <Icon name="plus" />
          </button>
        }
      />
      <div className="app-body gap-5">
        {up.length > 0 && (
          <div className="flex flex-col gap-3">
            <SectionHead title={t("common.upcoming")} />
            {up.map((r, i) => {
              const pilot = r.pilotId ? find(db.pilots, r.pilotId) : undefined;
              return (
                <button
                  key={r.id}
                  type="button"
                  className="link-card reveal"
                  style={{ ["--i" as string]: i }}
                  onClick={() => router.push(`/passenger/rides/${r.id}`)}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <TypeBadge type={r.type} />
                      <StatusBadge status={r.status} />
                    </span>
                    <span className="h2">{fmt.rideWhen(r)}</span>
                    <span className="flex items-center gap-2 text-sm muted">
                      <Icon
                        name="mapPin"
                        size={15}
                      />
                      <span className="truncate">{r.pickup}</span>
                    </span>
                    {pilot && (
                      <span className="flex items-center gap-2">
                        <Avatar name={pilot.name} />
                        <span className="text-sm font-semibold">
                          {pilot.name}
                        </span>
                      </span>
                    )}
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

        {up.length === 0 && past.length === 0 && (
          <EmptyState
            icon="calendar"
            text={t("pax.noRides")}
            cta={
              <button
                type="button"
                className="btn btn-primary btn-xl"
                onClick={() => router.push("/passenger/book")}
              >
                <Icon name="bike" />
                {t("pax.bookRide")}
              </button>
            }
          />
        )}

        {past.length > 0 && (
          <div className="flex flex-col gap-3">
            <SectionHead title={t("common.past")} />
            {past.map((r) => (
              <button
                key={r.id}
                type="button"
                className="record-card flex items-center justify-between gap-3"
                onClick={() => router.push(`/passenger/rides/${r.id}`)}
              >
                <span className="flex items-center gap-2">
                  <Icon
                    name={r.type === "functional" ? "route" : "heart"}
                    size={16}
                  />
                  <span className="muted">
                    {fmt.date(r.ts)} · {t(`type.${r.type}`)}
                  </span>
                </span>
                <StatusBadge status={r.status} />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
