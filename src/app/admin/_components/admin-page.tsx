import { Suspense, type ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageFallback } from "@/components/page-fallback";
import { requireAdminScope } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import type { NavKey } from "../nav";
import { ICONS } from "@/components/icons";

export function AdminPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-4 pt-2 pb-8 lg:px-6">
      {children}
    </div>
  );
}

export async function AdminPageBody({ page }: { page: NavKey }) {
  await requireAdminScope();
  const { title, body } = (await getDictionary()).admin.pages[page];
  const Icon = ICONS[page];

  return (
    <>
      <h1 className="text-2xl tracking-tight md:text-3xl">{title}</h1>
      <EmptyState
        icon={Icon}
        className="flex-1 justify-start rounded-none border-none pt-16"
      >
        {body}
      </EmptyState>
    </>
  );
}

export function AdminPage({ page }: { page: NavKey }) {
  return (
    <AdminPageShell>
      <Suspense fallback={<PageFallback />}>
        <AdminPageBody page={page} />
      </Suspense>
    </AdminPageShell>
  );
}

export function AdminPageHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl tracking-tight md:text-3xl">{title}</h1>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
