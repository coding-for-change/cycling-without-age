/// <reference types="react/canary" />
import { Suspense, ViewTransition, type ReactNode } from "react";
import { cacheLife } from "next/cache";
import { ICONS } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePerspective } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import type { MemberPerspective } from "../nav";
import { MEMBER_LIFE } from "./instant";
import { MemberEmpty } from "./member-empty";


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

export function MemberPageFallback() {
  return (
    <>
      <Skeleton className="h-9 w-44" />
      <div className="flex flex-1 flex-col items-center justify-start gap-4 p-6 pt-16">
        <Skeleton className="mb-2 size-10 rounded-lg" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-4 w-52 max-w-full" />
      </div>
    </>
  );
}

/** The destinations that are an empty state and nothing else, for now. */
export type MemberPageKey = "rides" | "calendar" | "chat";

/**
 * Re-guards under the shell on purpose: a Layout is not a security boundary in
 * Next, and one check in the shared body cannot be forgotten the way six
 * copies in six pages can. `getSession` is request-cached, so it costs nothing.
 */
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
      <MemberEmpty
        icon={Icon}
        className="flex-1 justify-start rounded-none border-none pt-16"
      >
        {strings[perspective].body}
      </MemberEmpty>
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
      <Suspense fallback={<MemberPageFallback />}>
        <MemberPageBody
          perspective={perspective}
          page={page}
        />
      </Suspense>
    </MemberPageShell>
  );
}
