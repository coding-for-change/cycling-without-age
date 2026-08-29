"use client";

/* All rides of the chapter, filterable by status. */

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import type { RideStatus } from "@/lib/types";
import { StatusBadge, TypeBadge } from "@/components/bits";
import { EmptyState } from "@/components/chrome";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { cn } from "@/lib/utils";
import { mucRides, rideWho, rideHref } from "../parts";
import { EventWizard } from "../events/EventWizard";

type Filter = "all" | RideStatus;

export default function RidesPageWrapper() {
  return (
    <Suspense>
      <RidesPage />
    </Suspense>
  );
}

/* /admin/rides?plan=<partnerId> — the partner page's "plan a ride day"
   handoff: opens the event wizard pre-filled with that partner. */
function RidesPage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const [filter, setFilter] = useState<Filter>("all");
  const planPartnerId = useSearchParams().get("plan");

  const all = mucRides(db).sort((a, b) => b.ts - a.ts);
  const shown = filter === "all" ? all : all.filter((r) => r.status === filter);

  return (
    <>
      {planPartnerId && (
        <EventWizard
          prePartnerId={planPartnerId}
          onClose={() => router.replace("/admin/rides")}
        />
      )}
      <h1 className="h1">{t("admin.nav.rides")}</h1>
      <div className="flex flex-wrap gap-2">
        {(
          [
            "all",
            "open",
            "staffed",
            "in_progress",
            "done",
            "cancelled",
          ] as Filter[]
        ).map((f) => {
          const n =
            f === "all" ? all.length : all.filter((r) => r.status === f).length;
          return (
            <button
              key={f}
              type="button"
              className={cn("chip", filter === f && "active")}
              onClick={() => setFilter(f)}
            >
              {`${f === "all" ? t("common.all") : t(`status.${f}`)} · ${n}`}
            </button>
          );
        })}
      </div>
      {shown.length ? (
        <ResponsiveTable
          rows={shown}
          cols={[
            { label: t("admin.col.when"), render: (r) => fmt.rideWhen(r) },
            {
              label: t("common.passenger"),
              render: (r) => (
                <span className="font-semibold">{rideWho(db, r)}</span>
              ),
            },
            {
              label: t("admin.col.type"),
              render: (r) => <TypeBadge type={r.type} />,
            },
            {
              label: t("common.pilot"),
              render: (r) => find(db.pilots, r.pilotId)?.name || "—",
            },
            {
              label: t("common.trishaw"),
              render: (r) => {
                if (r.trishaws)
                  return r.trishaws
                    .map((id) => find(db.trishaws, id)?.number || id)
                    .join(", ");
                return find(db.trishaws, r.trishawId)?.number || "—";
              },
            },
            {
              label: t("common.status"),
              render: (r) => <StatusBadge status={r.status} />,
            },
          ]}
          card={(r) => {
            const p = find(db.pilots, r.pilotId);
            return (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{rideWho(db, r)}</div>
                  <div className="muted text-sm">
                    {fmt.rideWhen(r)}
                    {p ? ` · ${p.name}` : ""}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            );
          }}
          onRow={(r) => router.push(rideHref(r))}
        />
      ) : (
        <div className="card">
          <EmptyState
            icon="bike"
            text={t("admin.dash.noneToday")}
          />
        </div>
      )}
    </>
  );
}
