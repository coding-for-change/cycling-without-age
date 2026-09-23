import { cache } from "react";
import { headers } from "next/headers";
import { calendarFeeds } from "@/features/calendar-feeds";
import { availablePerspectives, canDeleteOwnAccount } from "@/lib/access";
import { calendarFeedUrl } from "@/lib/app-url";
import { getSession } from "@/lib/auth-guards";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { profile as profileFacade } from "@/features/profile";
import { resolveLocale, toIsoDateUtc } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { perspectiveChoices } from "@/lib/perspectives";
import type { AccountData } from "./types";

export const loadAccount = cache(async (): Promise<AccountData | null> => {
  const session = await getSession();
  if (!session) return null;

  const [person, dict, language, head, feed] = await Promise.all([
    profileFacade.getProfile(session.user.id),
    getDictionary(),
    getLocale(),
    headers(),
    calendarFeeds.getFeed(session.user.id),
  ]);

  const email = person?.email ?? session.user.email;
  const seed = avatarSeed(email);

  return {
    strings: dict.account,
    notation: resolveLocale(head.get("accept-language")),
    language,
    profile: {
      name: person?.name ?? session.user.name,
      email,
      avatar: avatarSvg(seed),
      avatarAnimated: avatarSvg(seed, true),
      birthDate: person?.birthDate ? toIsoDateUtc(person.birthDate) : null,
      gender: person?.gender ?? null,
    },
    perspectives: perspectiveChoices(session.access, dict),
    canDeleteAccount: canDeleteOwnAccount(session.access),
    notifications: {
      push: person?.notifyPush ?? false,
      email: person?.notifyEmail ?? false,
      chatPush: person?.notifyChatPush ?? true,
      chatEmail: person?.notifyChatEmail ?? true,
    },
    hasRides:
      (person?._count.passengers ?? 0) > 0 ||
      availablePerspectives(session.access).some(
        (perspective) => perspective !== "admin",
      ),
    calendarFeed: feed
      ? {
          url: calendarFeedUrl(feed.token),
          lastFetchedAt: feed.lastFetchedAt?.toISOString() ?? null,
        }
      : null,
    signOutLabel: dict.common.signOut,
    cancelLabel: dict.common.back,
  };
});
