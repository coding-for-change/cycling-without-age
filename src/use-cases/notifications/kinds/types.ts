import type { z } from "zod";
import type { NotificationMessage } from "@/emails/notification";
import type { EmailStrings } from "@/emails/strings";
import type {
  DeliveryChannel,
  NotificationCategory,
  NotificationPayload,
} from "@/features/notifications";
import type { DomainEvent, EventOf, EventType } from "@/lib/events/catalog";

export type Message = NotificationMessage & { template?: string };

/**
 * One notification kind, in one file: what it reacts to, who gets it, which
 * facts are stored, and how those facts become a message. `notify` and the
 * delivery adapters are generic over this, so a new kind never touches them.
 */
export type Kind<
  K extends EventType,
  P extends z.ZodType<NotificationPayload>,
> = {
  event: K;
  category: NotificationCategory;
  channels: DeliveryChannel[];
  payload: P;
  recipients: (event: EventOf<K>) => Promise<string[]>;
  params: (event: EventOf<K>) => Promise<z.infer<P>>;
  href: (event: EventOf<K>) => string;
  message: (params: z.infer<P>, strings: EmailStrings) => Message;
};

export const defineKind = <
  K extends EventType,
  P extends z.ZodType<NotificationPayload>,
>(
  kind: Kind<K, P>,
) => kind;

export type AnyKind = {
  event: EventType;
  category: NotificationCategory;
  channels: DeliveryChannel[];
  payload: z.ZodType<NotificationPayload>;
  recipients(event: DomainEvent): Promise<string[]>;
  params(event: DomainEvent): Promise<NotificationPayload>;
  href(event: DomainEvent): string;
  message(params: NotificationPayload, strings: EmailStrings): Message;
};
