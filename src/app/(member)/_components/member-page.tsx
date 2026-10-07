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
import { EmptyState } from "@/components/empty-state";

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

export function MemberPageShell({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={MEMBER_ENTER}
      exit={MEMBER_EXIT}
      default="none"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-2 pb-8 lg:px-6">
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
