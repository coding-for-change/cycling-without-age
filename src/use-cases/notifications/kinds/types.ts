import type { z } from "zod";
import type { NotificationMessage } from "@/emails/notification";
import type { EmailStrings } from "@/emails/strings";
import type {
  NotificationCategory,
  NotificationPayload,
} from "@/features/notifications";
import type { DomainEvent, EventOf, EventType } from "@/lib/events/catalog";
import type { Locale } from "@/lib/i18n/locales";

export type Message = NotificationMessage & {
  template?: string;
  // The bell and the push banner have no room for an email heading; when a kind
  // wants a shorter one it sets this and the heading stays with the mail.
  title?: string;
};

/**
 * Where a kind is allowed to go. `optional: true` hands the decision to the
 * recipient's `notifyEmail`/`notifyPush`; essential kinds ignore both. The
 * checks run at delivery time so every outcome becomes a `Delivery` row.
 */
export type DeliveryPolicy = {
  push: boolean;
  email: "always" | "ifNoPush" | "never";
  optional: boolean;
};

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
  policy: DeliveryPolicy;
  payload: P;
  recipients: (event: EventOf<K>) => Promise<string[]>;
  params: (event: EventOf<K>) => Promise<z.infer<P>>;
  href: (event: EventOf<K>) => string;
  collapseKey?: (event: EventOf<K>) => string;
  /**
   * The chapter's say on the push channel, read at delivery time like the
   * recipient's own preference so a switched-off push still leaves a
   * `Delivery` row. Absent means the chapter has no switch for this kind.
   */
  chapterAllowsPush?: (chapterId: string | null) => Promise<boolean>;
  message: (
    params: z.infer<P>,
    strings: EmailStrings,
    locale: Locale,
  ) => Message;
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
  policy: DeliveryPolicy;
  payload: z.ZodType<NotificationPayload>;
  recipients(event: DomainEvent): Promise<string[]>;
  params(event: DomainEvent): Promise<NotificationPayload>;
  href(event: DomainEvent): string;
  collapseKey?(event: DomainEvent): string;
  chapterAllowsPush?(chapterId: string | null): Promise<boolean>;
  message(
    params: NotificationPayload,
    strings: EmailStrings,
    locale: Locale,
  ): Message;
};
