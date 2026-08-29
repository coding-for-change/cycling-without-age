"use client";

/* Chat thread with the pilot (and the chapter team). Full-height view —
   the shell hides the tab dock here. */

import { useRouter, useParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { chatForRide } from "@/lib/selectors";
import { BackHead, EmptyState } from "@/components/chrome";
import { ChatThread } from "@/components/ChatThread";
import { usePassenger } from "../../session";

export default function ChatPage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const { rideId } = useParams<{ rideId: string }>();
  const db = useStore((s) => s.db)!;
  const session = usePassenger();

  const ride = find(db.rides, rideId);
  const chat = chatForRide(db, rideId);
  const pilot = ride?.pilotId ? find(db.pilots, ride.pilotId) : undefined;

  const header = (
    <BackHead
      back="/passenger/chats"
      title={pilot ? pilot.name : t("common.chat")}
      sub={ride ? fmt.rideWhen(ride) : undefined}
      right={
        ride ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => router.push(`/passenger/rides/${ride.id}`)}
          >
            {t("chat.viewBooking")}
          </button>
        ) : undefined
      }
    />
  );

  if (!chat) {
    return (
      <>
        {header}
        <div className="chat-scroll">
          <EmptyState
            icon="chat"
            text={t("pax.chatEmpty")}
          />
        </div>
      </>
    );
  }

  return (
    <ChatThread
      rideId={rideId}
      myRole="client"
      myName={session.name}
      notifyAudiences={["pilot"]}
      notifyHref={`/pilot/chats/${rideId}`}
      header={header}
    />
  );
}
