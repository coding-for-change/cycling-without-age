"use client";

/* Chapter dashboard: month stats, the attention list (one card per concrete
   issue, each with its own action), and today's rides. */

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { StatusBadge } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/chrome";
import {
  AssignPilotModal,
  mucRides,
  ridePilots,
  rideWho,
  rideHref,
  sameMonth,
  sameDay,
} from "./parts";

export default function AdminDashboard() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const [assignId, setAssignId] = useState<string | null>(null);

  const [now] = useState(() => Date.now());
  const rides = mucRides(db);

  const ridesMonth = rides.filter(
    (r) =>
      ["done", "open", "staffed", "in_progress"].includes(r.status) &&
      sameMonth(r.ts),
  ).length;
  const openReq = rides.filter((r) => r.status === "requested").length;
  const activePilots = ridePilots(db).length;
  const donations = rides.reduce(
    (sum, r) =>
      sum + (r.debrief && sameMonth(r.ts) ? r.debrief.donation || 0 : 0),
    0,
  );

  /* one card per concrete issue, each with its own specific action */
  const issues: {
    icon: string;
    title: string;
    sub: string;
    actions: ReactNode;
  }[] = [];
  rides.forEach((r) => {
    if (
      r.status === "open" &&
      r.type !== "event" &&
      r.ts > now &&
      r.ts < now + 24 * 36e5
    ) {
      issues.push({
        icon: "user",
        title: t("admin.att.noPilot", { name: rideWho(db, r).split(" ")[0] }),
        sub: `${fmt.dayTime(r.ts)} · ${fmt.rel(r.ts)}`,
        actions: (
          <>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setAssignId(r.id)}
            >
              <Icon name="user" />
              {t("admin.att.assign")}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => router.push(rideHref(r))}
            >
              {t("admin.att.openBooking")}
            </button>
          </>
        ),
      });
    }
    if (
      r.type === "event" &&
      r.pilots &&
      r.status !== "cancelled" &&
      r.ts > now &&
      r.ts < now + 14 * 864e5
    ) {
      Object.keys(r.pilots).forEach((k) => {
        if (r.pilots![k]) return;
        const tw = find(db.trishaws, k);
        issues.push({
          icon: "users",
          title: t("admin.att.event", {
            place: rideWho(db, r),
            trishaw: tw?.number || k,
          }),
          sub: `${fmt.dayTime(r.ts)} · ${fmt.rel(r.ts)}`,
          actions: (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => router.push(rideHref(r))}
            >
              <Icon name="users" />
              {t("admin.att.staffEvent")}
            </button>
          ),
        });
      });
    }
  });

  const todays = rides
    .filter((r) => sameDay(r.ts, now) && r.status !== "cancelled")
    .sort((a, b) => a.ts - b.ts);

  return (
    <>
      <h1 className="h1">{t("admin.nav.dashboard")}</h1>

      <div className="grid-4">
        {(
          [
            [fmt.num(ridesMonth), "admin.dash.ridesMonth"],
            [fmt.num(openReq), "admin.dash.openReq"],
            [fmt.num(activePilots), "admin.dash.activePilots"],
            [fmt.euro(donations), "admin.dash.donations"],
          ] as [string, string][]
        ).map(([v, k]) => (
          <div
            key={k}
            className="stat-tile"
          >
            <div className="stat-value">{v}</div>
            <div className="stat-label">{t(k)}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <span style={{ color: "var(--red)" }}>
            <Icon
              name="alert"
              size={18}
            />
          </span>
          <h2 className="h2">{t("admin.att.title")}</h2>
          {issues.length > 0 && (
            <span className="badge badge-red">{fmt.num(issues.length)}</span>
          )}
        </div>
        {issues.length ? (
          <div className="flex flex-col gap-3">
            {issues.map((a, i) => (
              <div
                key={i}
                className="card"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    <span className="icon-tile">
                      <Icon name={a.icon} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold">{a.title}</div>
                      <div className="muted text-sm">{a.sub}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.actions}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon="checkCheck"
              text={t("admin.att.allClear")}
            />
          </div>
        )}
      </div>

      <div>
        <h2 className="h2 mb-4">{t("admin.dash.today")}</h2>
        {todays.length ? (
          <div className="flex flex-col gap-2">
            {todays.map((r) => {
              const p = find(db.pilots, r.pilotId);
              return (
                <button
                  key={r.id}
                  type="button"
                  className="record-card"
                  onClick={() => router.push(rideHref(r))}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <span className="font-semibold tabular-nums">
                        {fmt.time(r.ts)}
                      </span>
                      <div>
                        <div className="font-semibold">{rideWho(db, r)}</div>
                        <div className="muted text-sm">
                          {p ? (
                            p.name
                          ) : (
                            <span className="badge badge-red">
                              {t("status.open")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="card">
            <div className="muted text-sm">{t("admin.dash.noneToday")}</div>
          </div>
        )}
      </div>

      {assignId && (
        <AssignPilotModal
          rideId={assignId}
          onClose={() => setAssignId(null)}
        />
      )}
    </>
  );
}
