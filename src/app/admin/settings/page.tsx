import { Suspense } from "react";
import { joinUrl } from "@/lib/app-url";
import { getDictionary } from "@/lib/i18n";
import {
  AdminPageFallback,
  AdminPageHeader,
  AdminPageShell,
} from "../_components/admin-page";
import { readActiveScope } from "../active-scope";
import { JoinLinkCard } from "./_components/join-link-card";

type AdminSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function SettingsPage({
  searchParams,
}: {
  searchParams: AdminSearchParams;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<AdminPageFallback />}>
        <Settings searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Settings({ searchParams }: { searchParams: AdminSearchParams }) {
  const { active } = await readActiveScope(searchParams);
  const dict = await getDictionary();

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.settings.title} />
      {active.kind === "chapter" ? (
        <JoinLinkCard
          url={joinUrl(active.chapter.slug)}
          slug={active.chapter.slug}
          labels={dict.admin.settings.joinLink}
        />
      ) : (
        <p className="max-w-prose text-sm text-ink-soft">
          {dict.admin.settings.pickChapter}
        </p>
      )}
    </>
  );
}
