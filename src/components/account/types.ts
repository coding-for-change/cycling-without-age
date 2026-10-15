import type { CalendarFeedState } from "@/features/calendar-feeds/actions";
import type { Locale as Notation } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale as UiLocale } from "@/lib/i18n/locales";
import type { Perspective } from "@/lib/access";
import type { PerspectiveChoice } from "@/lib/perspectives";
import { PERSPECTIVE_HOME } from "@/lib/redirects";

export type AccountStrings = Dictionary["account"];

export type AccountData = {
  strings: AccountStrings;
  notation: Notation;
  language: UiLocale;
  theme: Dictionary["common"]["theme"];
  profile: {
    name: string;
    email: string;
    avatar: string;
    avatarAnimated: string;
    photoUrl: string | null;
    href: string | null;
    linkLabel: string;
    people: { href: string; label: string } | null;
    birthDate: string | null;
    gender: "female" | "male" | "other" | null;
  };
  perspectives: PerspectiveChoice[];
  canDeleteAccount: boolean;
  ridersRemovedWithAccount: number;
  notifications: {
    push: boolean;
    email: boolean;
    chatPush: boolean;
    chatEmail: boolean;
  };
  hasRides: boolean;
  calendarFeed: CalendarFeedState | null;
  signOutLabel: string;
  cancelLabel: string;
};

export const profileHref = (
  fallback: string | null,
  perspective: Perspective | undefined,
) =>
  fallback && perspective && perspective !== "admin"
    ? `${PERSPECTIVE_HOME[perspective]}/profile`
    : fallback;
