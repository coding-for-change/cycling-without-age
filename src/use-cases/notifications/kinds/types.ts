import type { z } from "zod";
import type { NotificationMessage } from "@/emails/notification";
import type { EmailStrings } from "@/emails/strings";
import type {
  NotificationCategory,
  NotificationPayload,
} from "@/features/notifications";
import type { DomainEvent, EventOf, EventType } from "@/lib/events/catalog";
import type { IcsCalendar } from "@/lib/ics";
import type { Locale } from "@/lib/i18n/locales";

export type Message = NotificationMessage & {
  template?: string;
  title?: string;
};

/** A calendar file the mail carries; `deliver-email` renders it with `lib/ics`. */
export type CalendarAttachment = { filename: string; calendar: IcsCalendar };

/**
 * A recipient who reads the event in a role of their own: the audience lands
 * in their stored payload and picks their copy and their link.
 */
export type Recipient = string | { userId: string; audience: string };

export type DeliveryPolicy = {
  push: boolean;
  email: "always" | "ifNoPush" | "never";
  optional: boolean;
};

export type Kind<
  K extends EventType,
  P extends z.ZodType<NotificationPayload>,
> = {
  event: K;
  category: NotificationCategory;
  policy: DeliveryPolicy;
  payload: P;
  recipients: (event: EventOf<K>) => Promise<Recipient[]>;
  params: (event: EventOf<K>) => Promise<z.infer<P>>;
  /**
   * When one event reaches people in different roles, each stored row can
   * carry who it was written for, so the message reads right for that reader.
   */
  forRecipient?: (params: z.infer<P>, recipientUserId: string) => z.infer<P>;
  href: (event: EventOf<K>, audience?: string) => string;
  collapseKey?: (event: EventOf<K>) => string;
  chapterAllowsPush?: (chapterId: string | null) => Promise<boolean>;
  /**
   * Fills in what the stored payload deliberately leaves out — a person's
   * name, kept as an id so deleting the person deletes the name too — just
   * before the message is written.
   */
  hydrate?: (params: z.infer<P>) => Promise<z.infer<P>>;
  message: (
    params: z.infer<P>,
    strings: EmailStrings,
    locale: Locale,
  ) => Message;
  attachments?: (
    params: z.infer<P>,
    strings: EmailStrings,
    locale: Locale,
  ) => CalendarAttachment[];
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
  recipients(event: DomainEvent): Promise<Recipient[]>;
  params(event: DomainEvent): Promise<NotificationPayload>;
  forRecipient?(
    params: NotificationPayload,
    recipientUserId: string,
  ): NotificationPayload;
  href(event: DomainEvent, audience?: string): string;
  collapseKey?(event: DomainEvent): string;
  chapterAllowsPush?(chapterId: string | null): Promise<boolean>;
  hydrate?(params: NotificationPayload): Promise<NotificationPayload>;
  message(
    params: NotificationPayload,
    strings: EmailStrings,
    locale: Locale,
  ): Message;
  attachments?(
    params: NotificationPayload,
    strings: EmailStrings,
    locale: Locale,
  ): CalendarAttachment[];
};
