/// <reference types="react/canary" />
import { Suspense, ViewTransition, type ReactNode } from "react";
import { cacheLife } from "next/cache";
import { ICONS } from "@/components/icons";
import { PageFallback } from "@/components/page-fallback";
import { requirePerspective } from "@/lib/auth-guards";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getPassengerAudience } from "@/use-cases/passenger-audience";
import { audienceCopy } from "./audience-copy";
import type { MemberPerspective } from "../nav";
import { MEMBER_LIFE } from "./instant";
import { MEMBER_ENTER, MEMBER_EXIT } from "./member-transitions";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export function MemberPageShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <ViewTransition
      enter={MEMBER_ENTER}
      exit={MEMBER_EXIT}
      default="none"
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col gap-6 px-4 pt-2 pb-8 lg:px-6",
          wide ? "max-w-6xl" : "max-w-2xl",
        )}
      >
        {children}
      </div>
    </ViewTransition>
  );
}

export type MemberPageKey = "rides" | "calendar";

export async function MemberPageBody({
  perspective,
  page,
}: {
  perspective: MemberPerspective;
  page: MemberPageKey;
}) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective(perspective);
  const [dict, locale, audience] = await Promise.all([
    getDictionary(),
    getLocale(),
    perspective === "passenger" ? getPassengerAudience(session.user.id) : null,
  ]);
  const strings = dict.member.pages[page];
  const Icon = ICONS[page];

  return (
    <>
      <h1 className="text-2xl tracking-tight md:text-3xl">{strings.title}</h1>
      <EmptyState
        icon={Icon}
        className="flex-1 justify-start rounded-none border-none pt-16"
      >
        {audienceCopy(
          audience,
          strings[perspective].body,
          strings.passenger.caretakerBody,
          locale,
        )}
      </EmptyState>
    </>
  );
}

export function MemberPage({
  perspective,
  page,
}: {
  perspective: MemberPerspective;
  page: MemberPageKey;
}) {
  return (
    <MemberPageShell>
      <Suspense fallback={<PageFallback />}>
        <MemberPageBody
          perspective={perspective}
          page={page}
        />
      </Suspense>
    </MemberPageShell>
  );
}
