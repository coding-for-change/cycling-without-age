"use client";

/* Messages — active vs past conversations, newest first. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { isActiveRide } from "@/lib/selectors";
import type { Chat } from "@/lib/types";
import { HeroHead, BrandDot, EmptyState } from "@/components/chrome";
import { Avatar, Seg } from "@/components/bits";
import { usePassenger } from "../session";
import { PaxBell } from "../parts";

function lastMsg(c: Chat) {
  return c.messages[c.messages.length - 1];
}

export default function ChatsPage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const session = usePassenger();
  const [tab, setTab] = useState<"active" | "past">("active");

  const rows = db.chats
    .map((c) => ({ c, r: find(db.rides, c.rideId) }))
    .filter((x) => !!x.r && x.r.clientId === session.userId)
    .filter((x) =>
      tab === "active" ? isActiveRide(x.r!) : !isActiveRide(x.r!),
    )
    .sort((a, b) => (lastMsg(b.c)?.ts || 0) - (lastMsg(a.c)?.ts || 0));

  return (
    <>
      <HeroHead
        lead={<BrandDot />}
        title={t("pax.tab.chats")}
        right={<PaxBell />}
      />
      <div className="app-body gap-5">
        <div className="[&>.seg]:flex [&>.seg]:w-full [&_button]:flex-1">
          <Seg
            options={[
              { value: "active" as const, label: t("chat.tabActive") },
              { value: "past" as const, label: t("chat.tabPast") },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
        {rows.length ? (
          <div className="flex flex-col gap-3">
            {rows.map((x, i) => {
              const last = lastMsg(x.c);
              const pilot = x.r!.pilotId
                ? find(db.pilots, x.r!.pilotId)
                : undefined;
              const who =
                last && last.from === "admin"
                  ? t("chat.adminLabel")
                  : pilot
                    ? pilot.name
                    : t("common.chat");
              const preview = !last
                ? ""
                : last.from === "system"
                  ? t(last.tKey || "")
                  : last.text;
              const unread =
                !!last && last.from !== "client" && last.from !== "system";
              return (
                <button
                  key={x.c.id}
                  type="button"
                  className="link-card reveal"
                  style={{ ["--i" as string]: i }}
                  onClick={() => router.push(`/passenger/chats/${x.r!.id}`)}
                >
                  <Avatar
                    name={who}
                    size="lg"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{who}</span>
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
            text={t("pax.noChats")}
          />
        )}
      </div>
    </>
  );
}
