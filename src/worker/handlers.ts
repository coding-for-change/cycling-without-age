import { eventTypes } from "@/lib/events/catalog";
import type { Envelope, EventType } from "@/lib/events/catalog";
import { notifyChatMessage } from "@/use-cases/chat-notifications/notify-chat-message";
import { findKind } from "@/use-cases/notifications/kinds";
import { notify } from "@/use-cases/notifications/notify";
import {
  enqueuePoster,
  enqueuePurge,
  enqueueTranscode,
} from "./listeners/media";
import {
  recordActivity,
  recordsActivityFor,
} from "./listeners/record-activity";
import { freezeRideChatListener } from "./listeners/freeze-ride-chat";
import { leaveRideCrewsListener } from "./listeners/leave-ride-crews";
import { linkRideRequestListener } from "./listeners/link-ride-request";
import { moveHandedOverRequestsListener } from "./listeners/move-handed-over-requests";
import {
  syncRideChatListener,
  syncsRideChat,
} from "./listeners/sync-ride-chat";
import {
  recordCoursePassed,
  recordExemptionGranted,
  recordExemptionRevoked,
} from "./listeners/training";

export type Listener<K extends EventType = EventType> = (
  envelope: Envelope<K>,
) => Promise<void>;

type Registry = { [K in EventType]: Record<string, Listener<K> | Listener> };

export const handlers = Object.fromEntries(
  eventTypes.map((type) => [
    type,
    {
      ...(findKind(type) ? { notify } : {}),
      ...(recordsActivityFor(type) ? { recordActivity } : {}),
      ...(type === "chat.messageSent" ? { chatNotify: notifyChatMessage } : {}),
      ...(syncsRideChat(type) ? { syncRideChat: syncRideChatListener } : {}),
      ...(type === "ride.completed"
        ? { freezeRideChat: freezeRideChatListener }
        : {}),
      ...(type === "member.roleChanged"
        ? { leaveRideCrews: leaveRideCrewsListener }
        : {}),
      ...(type === "ride.scheduled"
        ? { linkRideRequest: linkRideRequestListener }
        : {}),
      ...(type === "rider.handedOver"
        ? { moveRequests: moveHandedOverRequestsListener }
        : {}),
      ...(type === "trainingVideo.uploaded"
        ? { transcode: enqueueTranscode }
        : {}),
      ...(type === "trainingVideo.posterRequested"
        ? { poster: enqueuePoster }
        : {}),
      ...(type === "trainingVideo.deleted" ? { purge: enqueuePurge } : {}),
      ...(type === "training.coursePassed"
        ? { recordActivity: recordCoursePassed }
        : {}),
      ...(type === "training.exemptionGranted"
        ? { recordActivity: recordExemptionGranted }
        : {}),
      ...(type === "training.exemptionRevoked"
        ? { recordActivity: recordExemptionRevoked }
        : {}),
    },
  ]),
) as Registry;
