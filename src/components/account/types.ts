import type { Perspective } from "@/lib/access";
import type { Locale as Notation } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale as UiLocale } from "@/lib/i18n/locales";

export type AccountStrings = Dictionary["account"];

export type PerspectiveOption = {
  perspective: Perspective;
  label: string;
  href: string;
};

/**
 * Everything the account surface renders, resolved on the server and handed
 * down as strings and booleans. Two locales travel side by side: `notation` is
 * how dates are written, `language` is the words the UI is in — a German UI in
 * an American browser gets `de` words in `en-US` notation.
 */
export type AccountData = {
  strings: AccountStrings;
  perspectiveLabels: Record<Perspective, string>;
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
  perspectives: PerspectiveOption[];
  canDeleteAccount: boolean;
  notifications: { push: boolean; email: boolean };
  signOutLabel: string;
  cancelLabel: string;
};
