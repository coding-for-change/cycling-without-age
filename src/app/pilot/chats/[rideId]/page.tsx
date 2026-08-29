"use client";

/* One conversation — chromeless, full height (the gate hides the dock here). */

import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { BackHead } from "@/components/chrome";
import { ChatThread } from "@/components/ChatThread";
import { usePilot } from "../../pilot-context";
import { rideName } from "../../lib";

export default function PilotChatPage() {
  const { rideId } = useParams<{ rideId: string }>();
  const router = useRouter();
  const { t, fmt } = useI18n();
  const db = useStore((s) => s.db)!;
  const { pilotName } = usePilot();

  const ride = find(db.rides, rideId);
  if (!ride) return <BackHead back="/pilot/chats" />;
  const client = ride.clientId ? find(db.clients, ride.clientId) : undefined;
  const title = client ? client.name : rideName(ride, db);

  return (
    <div className="flex h-dvh flex-col">
      <BackHead
        back="/pilot/chats"
        title={title}
        sub={fmt.rideWhen(ride)}
        right={
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => router.push(`/pilot/rides/${rideId}`)}
          >
            {t("chat.viewBooking")}
          </button>
        }
      />
      <ChatThread
        rideId={rideId}
        myRole="pilot"
        myName={pilotName}
        notifyAudiences={ride.clientId ? [`client:${ride.clientId}`] : []}
        notifyHref={`/passenger/chats/${rideId}`}
      />
    </div>
  );
}
