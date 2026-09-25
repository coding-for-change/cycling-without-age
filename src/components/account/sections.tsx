"use client";

import {
  Bell,
  CalendarSync,
  CircleUserRound,
  KeyRound,
  Languages,
  LifeBuoy,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { CalendarSection } from "./calendar-section";
import { DangerSection } from "./danger-section";
import { LanguageSection } from "./language-section";
import { NotificationsSection } from "./notifications-section";
import { PasskeysSection } from "./passkeys-section";
import { ProfileSection } from "./profile-section";
import { SupportSection } from "./support-section";
import type { AccountData, AccountStrings } from "./types";

export type AccountSectionKey =
  | "profile"
  | "language"
  | "notifications"
  | "calendar"
  | "passkeys"
  | "support"
  | "danger";

type AccountSection = {
  key: AccountSectionKey;
  icon: LucideIcon;
  visible?: (data: AccountData) => boolean;
};

const ACCOUNT_SECTIONS: AccountSection[] = [
  { key: "profile", icon: CircleUserRound },
  { key: "language", icon: Languages },
  { key: "notifications", icon: Bell },
  {
    key: "calendar",
    icon: CalendarSync,
    visible: (data) => data.hasRides || data.calendarFeed !== null,
  },
  { key: "passkeys", icon: KeyRound },
  { key: "support", icon: LifeBuoy },
  { key: "danger", icon: TriangleAlert },
];

export const accountSections = (data: AccountData) =>
  ACCOUNT_SECTIONS.filter((section) => section.visible?.(data) ?? true);

export const sectionTitle = (strings: AccountStrings, key: AccountSectionKey) =>
  strings[key].title;

export function AccountSectionBody({
  section,
  label,
  data,
}: {
  section: AccountSectionKey;
  label?: string;
  data: AccountData;
}) {
  switch (section) {
    case "profile":
      return (
        <ProfileSection
          data={data}
          label={label}
        />
      );
    case "language":
      return (
        <LanguageSection
          data={data}
          label={label}
        />
      );
    case "notifications":
      return (
        <NotificationsSection
          data={data}
          label={label}
        />
      );
    case "calendar":
      return (
        <CalendarSection
          data={data}
          label={label}
        />
      );
    case "passkeys":
      return (
        <PasskeysSection
          data={data}
          label={label}
        />
      );
    case "support":
      return (
        <SupportSection
          data={data}
          label={label}
        />
      );
    case "danger":
      return (
        <DangerSection
          data={data}
          label={label}
        />
      );
  }
}
