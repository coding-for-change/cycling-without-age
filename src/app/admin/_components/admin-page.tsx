import { Suspense, type ReactNode } from "react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdminScope } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import type { NavKey } from "../nav";
import { ICONS } from "./icons";

export function AdminPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-4 pt-2 pb-8 lg:px-6">
      {children}
    </div>
  );
}

export function AdminPageFallback() {
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

/**
 * Re-guards below the layout on purpose: a Layout is not a security boundary in
 * Next, and living in the shared body rather than in each of the eleven pages
 * makes the check impossible to forget when a twelfth is added. `getSession` is
 * request-cached, so the repeat costs nothing.
 */
export async function AdminPageBody({ page }: { page: NavKey }) {
  await requireAdminScope();
  const { title, body } = (await getDictionary()).admin.pages[page];
  const Icon = ICONS[page];

  return (
    <>
      <h1 className="text-2xl tracking-tight md:text-3xl">{title}</h1>
      <Empty className="flex-1 justify-start pt-16">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="bg-mint-tint text-ink"
          >
            <Icon />
          </EmptyMedia>
          <EmptyDescription className="text-ink-soft">{body}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </>
  );
}

export function AdminPage({ page }: { page: NavKey }) {
  return (
    <AdminPageShell>
      <Suspense fallback={<AdminPageFallback />}>
        <AdminPageBody page={page} />
      </Suspense>
    </AdminPageShell>
  );
}
