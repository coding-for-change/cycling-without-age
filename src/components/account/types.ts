import type { Locale as Notation } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale as UiLocale } from "@/lib/i18n/locales";
import type { PerspectiveChoice } from "@/lib/perspectives";

export type AccountStrings = Dictionary["account"];

export type AccountData = {
  strings: AccountStrings;
  notation: Notation;
  language: UiLocale;
  profile: {
    name: string;
    email: string;
    avatar: string;
    avatarAnimated: string;
    birthDate: string | null;
    gender: "female" | "male" | "other" | null;
  };
  perspectives: PerspectiveChoice[];
  canDeleteAccount: boolean;
  notifications: {
    push: boolean;
    email: boolean;
    chatPush: boolean;
    chatEmail: boolean;
  };
  signOutLabel: string;
  cancelLabel: string;
};
