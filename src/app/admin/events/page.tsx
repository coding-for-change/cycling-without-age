"use client";

/* Events: roster fill state per event + the three-step "plan event" wizard
   (where → when & capacity with live roster preview → review). */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/chrome";
import { StatusBadge } from "@/components/bits";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { mucRides, rideWho } from "../parts";
import { EventWizard } from "./EventWizard";

export default function EventsPage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const [wizard, setWizard] = useState(false);

  const evs = mucRides(db)
    .filter((r) => r.type === "event")
    .sort((a, b) => a.ts - b.ts);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">{t("admin.nav.events")}</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setWizard(true)}
        >
          <Icon name="plus" />
          {t("admin.ev.plan")}
        </button>
      </div>
      {evs.length ? (
        <ResponsiveTable
          rows={evs}
          cols={[
            {
              label: t("admin.col.partner"),
              render: (r) => (
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-semibold">{rideWho(db, r)}</span>
                  {r.public && (
                    <span className="badge badge-grey">
                      {t("admin.ev.public")}
                    </span>
                  )}
                </span>
              ),
            },
            { label: t("admin.col.when"), render: (r) => fmt.rideWhen(r) },
            {
              label: t("admin.col.slots"),
              render: (r) => {
                const filled = (r.roster || []).filter((x) => x.name).length;
                return (
                  <span className="tabular-nums">
                    {filled}/{(r.roster || []).length}
                  </span>
                );
              },
            },
            {
              label: t("admin.nav.pilots"),
              render: (r) => {
                const keys = Object.keys(r.pilots || {});
                const n = keys.filter((k) => r.pilots![k]).length;
                return (
                  <span className="tabular-nums">
                    {n}/{keys.length}
                  </span>
                );
              },
            },
            {
              label: t("common.status"),
              render: (r) => <StatusBadge status={r.status} />,
            },
          ]}
          card={(r) => {
            const filled = (r.roster || []).filter((x) => x.name).length;
            return (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{rideWho(db, r)}</div>
                  <div className="muted text-sm">
                    {fmt.rideWhen(r)} · {filled}/{(r.roster || []).length}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            );
          }}
          onRow={(r) => router.push(`/admin/rides/${r.id}`)}
        />
      ) : (
        <div className="card">
          <EmptyState
            icon="users"
            text={t("admin.par.none")}
          />
        </div>
      )}
      {wizard && <EventWizard onClose={() => setWizard(false)} />}
    </>
  );
}
