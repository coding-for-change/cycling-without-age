"use client";

/* Upcoming events near you — public ones plus those at your facility. */

import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { BackHead, EmptyState } from "@/components/chrome";
import { usePassenger } from "../session";
import { PaxEventCard, myEvents } from "../parts";

export default function EventsPage() {
  const { t } = useI18n();
  const db = useStore((s) => s.db)!;
  const session = usePassenger();
  const list = myEvents(db, find(db.clients, session.userId));

  return (
    <>
      <BackHead
        back="/passenger"
        title={t("common.events")}
      />
      <div className="app-body gap-5">
        <div className="display display-sm">{t("pax.eventsTitle")}</div>
        {list.length ? (
          <div className="flex flex-col gap-3">
            {list.map((r, i) => (
              <div
                key={r.id}
                className="reveal"
                style={{ ["--i" as string]: i }}
              >
                <PaxEventCard
                  ride={r}
                  db={db}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="calendar"
            text={t("pax.noEvents")}
          />
        )}
      </div>
    </>
  );
}
