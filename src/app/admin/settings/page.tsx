import { Suspense } from "react";
import { chapters } from "@/features/chapters";
import { joinUrl } from "@/lib/app-url";
import { getDictionary, getLocale } from "@/lib/i18n";
import {
  AdminPageFallback,
  AdminPageHeader,
  AdminPageShell,
} from "../_components/admin-page";
import { readActiveScope } from "../active-scope";
import { JoinLinkCard } from "./_components/join-link-card";
import { NotificationSettingsCard } from "./_components/notification-settings-card";

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
  const chapter = active.kind === "chapter" ? active.chapter : null;

  const [dict, language, settings] = await Promise.all([
    getDictionary(),
    getLocale(),
    chapter ? chapters.getSettings(chapter.id) : null,
  ]);
  const strings = dict.admin.settings;

  if (!chapter || !settings)
    return (
      <>
        <AdminPageHeader title={dict.admin.pages.settings.title} />
        <p className="max-w-prose text-sm text-ink-soft">
          {strings.pickChapter}
        </p>
      </>
    );

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.settings.title} />
      <div className="grid gap-6">
        <JoinLinkCard
          url={joinUrl(chapter.slug)}
          slug={chapter.slug}
          labels={strings.joinLink}
        />
        <NotificationSettingsCard
          chapterId={chapter.id}
          settings={settings}
          language={language}
          labels={strings.notifications}
        />
      </div>
    </>
  );
}
