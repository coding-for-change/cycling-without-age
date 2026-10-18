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
import type { HeroName } from "@/components/art";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

const MEMBER_ENTER = {
  push: "push-in",
  pop: "pop-in",
  tab: "tab-in",
  default: "tab-in",
} as const;

const MEMBER_EXIT = {
  push: "push-out",
  pop: "pop-out",
  tab: "tab-out",
  default: "tab-out",
} as const;

export function MemberPageShell({
  wide = false,
  children,
}: {
  wide?: boolean;
  children: ReactNode;
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
          wide ? "max-w-5xl" : "max-w-2xl",
        )}
      >
        {children}
      </div>
    </ViewTransition>
  );
}

export type MemberPageKey = "rides" | "calendar";

/** A passenger's empty pages carry one of mockup 2's drawings. */
const PAGE_HERO: Partial<Record<MemberPageKey, HeroName>> = {
  calendar: "calendar",
};

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
      <h1
        className={cn(
          "text-2xl tracking-tight md:text-3xl",
          perspective === "passenger" && "max-md:sr-only",
        )}
      >
        {strings.title}
      </h1>
      <EmptyState
        icon={Icon}
        hero={perspective === "passenger" ? PAGE_HERO[page] : undefined}
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
