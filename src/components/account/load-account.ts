import { cache } from "react";
import { headers } from "next/headers";
import { calendarFeeds } from "@/features/calendar-feeds";
import { availablePerspectives, canDeleteOwnAccount } from "@/lib/access";
import { calendarFeedUrl } from "@/lib/app-url";
import { getSession } from "@/lib/auth-guards";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { passengers } from "@/features/passengers";
import { personProfiles, photoUrl } from "@/features/person-profiles";
import { profile as profileFacade } from "@/features/profile";
import { resolveLocale, toIsoDateUtc } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { perspectiveChoices } from "@/lib/perspectives";
import type { AccountData } from "./types";

export const loadAccount = cache(async (): Promise<AccountData | null> => {
  const session = await getSession();
  if (!session) return null;

  const [person, own, dict, language, head, feed, riders] = await Promise.all([
    profileFacade.getProfile(session.user.id),
    personProfiles.getProfile({ kind: "user", id: session.user.id }),
    getDictionary(),
    getLocale(),
    headers(),
    calendarFeeds.getFeed(session.user.id),
    passengers.countRidersRemovedWith(session.user.id),
  ]);

  const email = person?.email ?? session.user.email;
  const caretaker =
    (person?.managesOthers === true || riders > 0) &&
    availablePerspectives(session.access).includes("passenger");
  const seed = avatarSeed(email);

  return {
    strings: dict.account,
    notation: resolveLocale(head.get("accept-language")),
    language,
    theme: dict.common.theme,
    profile: {
      name: person?.name ?? session.user.name,
      email,
      avatar: avatarSvg(seed),
      avatarAnimated: avatarSvg(seed, true),
      photoUrl: photoUrl(own.photoFileId),
      href: availablePerspectives(session.access).some(
        (perspective) => perspective !== "admin",
      )
        ? "/profile"
        : null,
      linkLabel: caretaker
        ? dict.personProfile.yourProfile
        : dict.personProfile.viewProfile,
      people: caretaker
        ? {
            href: "/passenger/profile/people",
            label: dict.personProfile.managed.title,
          }
        : null,
      birthDate: person?.birthDate ? toIsoDateUtc(person.birthDate) : null,
      gender: person?.gender ?? null,
    },
    perspectives: perspectiveChoices(session.access, dict),
    canDeleteAccount: canDeleteOwnAccount(session.access),
    ridersRemovedWithAccount: riders,
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
