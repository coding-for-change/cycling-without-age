"use client";

/* Chat inbox: active rides vs past, newest message first. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import type { Chat, Ride } from "@/lib/types";
import { HeroHead, BrandDot, EmptyState } from "@/components/chrome";
import { Avatar, Seg } from "@/components/bits";
import { usePilot } from "../pilot-context";
import { isMine, rideName } from "../lib";

const lastMsg = (c: Chat) => c.messages[c.messages.length - 1];
const isPast = (r: Ride) => r.status === "done" || r.status === "cancelled";

export default function ChatsPage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const { pilotId, bell } = usePilot();
  const [tab, setTab] = useState<"active" | "past">("active");

  const items = db.chats
    .map((c) => ({ c, r: find(db.rides, c.rideId) }))
    .filter(
      (x): x is { c: Chat; r: Ride } =>
        !!x.r &&
        isMine(x.r, pilotId) &&
        (tab === "past" ? isPast(x.r) : !isPast(x.r)),
    )
    .sort((a, b) => (lastMsg(b.c)?.ts || 0) - (lastMsg(a.c)?.ts || 0));

  return (
    <>
      <HeroHead
        lead={<BrandDot />}
        title={t("pilot.tab.chats")}
        right={bell}
      />
      <div className="app-body gap-6">
        <Seg
          options={[
            { value: "active" as const, label: t("chat.tabActive") },
            { value: "past" as const, label: t("chat.tabPast") },
          ]}
          value={tab}
          onChange={setTab}
        />
        {items.length ? (
          <div className="flex flex-col gap-3">
            {items.map((x, i) => {
              const last = lastMsg(x.c);
              const client = x.r.clientId
                ? find(db.clients, x.r.clientId)
                : undefined;
              const name =
                last && last.from === "admin"
                  ? t("chat.adminLabel")
                  : client
                    ? client.name
                    : rideName(x.r, db);
              const preview = last
                ? last.from === "system"
                  ? t(last.tKey || "")
                  : last.text
                : "";
              const unread =
                !!last && last.from !== "pilot" && last.from !== "system";
              return (
                <button
                  key={x.c.id}
                  type="button"
                  className="link-card reveal"
                  style={{ ["--i" as string]: i }}
                  onClick={() => router.push(`/pilot/chats/${x.r.id}`)}
                >
                  <Avatar
                    name={name}
                    size="lg"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{name}</span>
                      <span className="text-xs muted">
                        {last ? fmt.rel(last.ts) : ""}
                      </span>
                    </span>
                    <span className="truncate text-sm muted">{preview}</span>
                  </span>
                  {unread && (
                    <span className="h-2.5 w-2.5 flex-none rounded-full bg-red" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="chat"
            text={t(
              tab === "past" ? "pilot.chats.emptyPast" : "pilot.chats.empty",
            )}
          />
        )}
      </div>
    </>
  );
}
