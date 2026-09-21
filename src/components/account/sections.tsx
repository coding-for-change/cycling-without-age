"use client";

import {
  Bell,
  CircleUserRound,
  KeyRound,
  Languages,
  LifeBuoy,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { ReportProblemButton } from "@/components/report-problem/report-problem-button";
import { DangerSection } from "./danger-section";
import { LanguageSection } from "./language-section";
import { NotificationsSection } from "./notifications-section";
import { PasskeysSection } from "./passkeys-section";
import { ProfileSection } from "./profile-section";
import type { AccountData, AccountStrings } from "./types";

export type AccountSectionKey =
  "profile" | "language" | "notifications" | "passkeys" | "support" | "danger";

export const ACCOUNT_SECTIONS: {
  key: AccountSectionKey;
  icon: LucideIcon;
}[] = [
  { key: "profile", icon: CircleUserRound },
  { key: "language", icon: Languages },
  { key: "notifications", icon: Bell },
  { key: "passkeys", icon: KeyRound },
  { key: "support", icon: LifeBuoy },
  { key: "danger", icon: TriangleAlert },
];

export const sectionTitle = (strings: AccountStrings, key: AccountSectionKey) =>
  strings[key].title;

export function AccountSectionBody({
  section,
  data,
}: {
  section: AccountSectionKey;
  data: AccountData;
}) {
  switch (section) {
    case "profile":
      return <ProfileSection data={data} />;
    case "language":
      return <LanguageSection data={data} />;
    case "notifications":
      return <NotificationsSection data={data} />;
    case "passkeys":
      return <PasskeysSection data={data} />;
    case "support":
      return (
        <div className="grid justify-items-start gap-3">
          <p className="max-w-prose text-sm text-ink-soft">
            {data.strings.support.body}
          </p>
          <ReportProblemButton strings={data.strings.support} />
        </div>
      );
    case "danger":
      return <DangerSection data={data} />;
  }
}
