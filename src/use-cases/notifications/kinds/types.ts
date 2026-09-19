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
  title?: string;
};

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
  recipients: (event: EventOf<K>) => Promise<string[]>;
  params: (event: EventOf<K>) => Promise<z.infer<P>>;
  href: (event: EventOf<K>) => string;
  collapseKey?: (event: EventOf<K>) => string;
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
