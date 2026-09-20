/// <reference types="react/canary" />
import { Suspense, ViewTransition, type ReactNode } from "react";
import { cacheLife } from "next/cache";
import { ICONS } from "@/components/icons";
import { PageFallback } from "@/components/page-fallback";
import { requirePerspective } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import type { MemberPerspective } from "../nav";
import { MEMBER_LIFE } from "./instant";
import { EmptyState } from "@/components/empty-state";

export function MemberPageShell({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter="tab-in"
      exit="tab-out"
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

  await requirePerspective(perspective);
  const strings = (await getDictionary()).member.pages[page];
  const Icon = ICONS[page];

  return (
    <>
      <h1 className="text-2xl tracking-tight md:text-3xl">{strings.title}</h1>
      <EmptyState
        icon={Icon}
        className="flex-1 justify-start rounded-none border-none pt-16"
      >
        {strings[perspective].body}
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
