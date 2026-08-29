"use client";

/* Chat inbox: active vs past ride threads, newest first. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, t as tt } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { Avatar, Seg } from "@/components/bits";
import { EmptyState } from "@/components/chrome";
import { CH, rideWho } from "../parts";

export default function AdminChatsPage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const [tab, setTab] = useState<"active" | "past">("active");

  const isPast = (status: string) =>
    status === "done" || status === "cancelled";
  const threads = db.chats
    .filter((c) => {
      const r = find(db.rides, c.rideId);
      if (!r || r.chapterId !== CH || !c.messages.length) return false;
      return tab === "past" ? isPast(r.status) : !isPast(r.status);
    })
    .sort(
      (a, b) =>
        b.messages[b.messages.length - 1].ts -
        a.messages[a.messages.length - 1].ts,
    );

  return (
    <>
      <h1 className="h1">{t("admin.nav.chats")}</h1>
      <div>
        <Seg
          options={[
            { value: "active" as const, label: t("chat.tabActive") },
            { value: "past" as const, label: t("chat.tabPast") },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {threads.length ? (
        <div className="flex flex-col gap-2">
          {threads.map((c) => {
            const r = find(db.rides, c.rideId)!;
            const who = rideWho(db, r);
            const p = find(db.pilots, r.pilotId);
            const last = c.messages[c.messages.length - 1];
            const preview =
              last.from === "system" ? tt(last.tKey || "") : last.text;
            const unread = last.from !== "admin";
            return (
              <button
                key={c.id}
                type="button"
                className="record-card"
                onClick={() => router.push(`/admin/chats/${r.id}`)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={who} />
                    <div className="min-w-0">
                      <div className="font-semibold">
                        {who}
                        {p ? ` · ${p.name}` : ""}
                      </div>
                      <div className="muted text-xs">{fmt.rideWhen(r)}</div>
                      <div
                        className="muted truncate text-sm"
                        style={{ maxWidth: "26rem" }}
                      >
                        {preview.slice(0, 80)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    {unread && <span className="unread-dot" />}
                    <span className="muted text-xs">{fmt.rel(last.ts)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon="chat"
            text={t("admin.chats.empty")}
          />
        </div>
      )}
    </>
  );
}
