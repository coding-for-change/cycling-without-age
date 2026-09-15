import { Suspense } from "react";
import { headers } from "next/headers";
import { loadAccount } from "@/components/account/load-account";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationBellSkeleton } from "@/components/notifications/notification-bell-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { getDictionary, getLocale } from "@/lib/i18n";
import { PERSPECTIVE_HOME, safeNextPath } from "@/lib/redirects";
import { resolveMemberNav, type MemberPerspective } from "../nav";
import { MemberTopBar } from "./member-top-bar";
import { signInHref } from "@/lib/redirects";

export async function MemberChrome({
  perspective,
}: {
  perspective: MemberPerspective;
}) {
  const [session, dict, locale, account, head] = await Promise.all([
    perspectiveViewerSession(perspective),
    getDictionary(),
    getLocale(),
    loadAccount(),
    headers(),
  ]);

  const next =
    safeNextPath(head.get("x-pathname")) ?? PERSPECTIVE_HOME[perspective];

  return (
    <MemberTopBar
      items={resolveMemberNav(perspective, dict.member.nav)}
      account={account}
      activePerspective={perspective}
      strings={dict.member.topBar[perspective]}
      signIn={{ href: signInHref(next), label: dict.member.guest.signIn }}
      locale={locale}
      languageLabel={dict.common.language}
      bell={
        session ? (
          <Suspense
            key="bell"
            fallback={<NotificationBellSkeleton className="size-9" />}
          >
            <NotificationBell className="size-9" />
          </Suspense>
        ) : null
      }
    />
  );
}

export function MemberChromeFallback() {
  return (
    <div className="relative flex min-h-16 shrink-0 items-center gap-2 px-4 pt-safe lg:px-6">
      <Skeleton className="size-11 rounded-full md:hidden" />
      <Skeleton className="hidden size-7 rounded-md md:block" />
      <Skeleton className="hidden h-4 w-24 md:block" />
      {/* No bell placeholder: a guest never gets one, and this fallback cannot
          know yet which of the two is reading. */}
      <div className="ml-auto flex items-center gap-2">
        <Skeleton className="hidden h-9 w-20 rounded-full md:block" />
      </div>
    </div>
  );
}
