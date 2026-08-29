"use client";

/* One ride thread — the chapter team speaks with the distinct admin styling. */

import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { Avatar } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/chrome";
import { AdminChat, rideWho, rideHref } from "../../parts";

export default function AdminChatPage() {
  const { rideId } = useParams<{ rideId: string }>();
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;

  const r = find(db.rides, rideId);
  const c = db.chats.find((x) => x.rideId === rideId);

  if (!r || !c) {
    return (
      <>
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => router.push("/admin/chats")}
          >
            <Icon name="arrowLeft" />
            {t("common.back")}
          </button>
        </div>
        <div className="card">
          <EmptyState
            icon="chat"
            text={t("admin.chats.empty")}
          />
        </div>
      </>
    );
  }

  const who = rideWho(db, r);
  const p = find(db.pilots, r.pilotId);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="icon-pill"
            onClick={() => router.push("/admin/chats")}
            aria-label={t("common.back")}
          >
            <Icon name="arrowLeft" />
          </button>
          <Avatar name={who} />
          <div>
            <div className="font-semibold">
              {who}
              {p ? ` · ${p.name}` : ""}
            </div>
            <div className="muted text-xs">{fmt.rideWhen(r)}</div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => router.push(rideHref(r))}
        >
          <Icon name="externalLink" />
          {t("chat.viewBooking")}
        </button>
      </div>
      <AdminChat
        rideId={r.id}
        maxHeight="60vh"
      />
    </>
  );
}
