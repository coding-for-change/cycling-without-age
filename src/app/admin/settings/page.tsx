import { Suspense } from "react";
import { chapters } from "@/features/chapters";
import { SupportCard } from "@/components/report-problem/support-card";
import { joinUrl } from "@/lib/app-url";
import { getDictionary, getLocale } from "@/lib/i18n";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { JoinLinkCard } from "./_components/join-link-card";
import { NotificationSettingsCard } from "./_components/notification-settings-card";
import { PostRideInstructionsCard } from "./_components/post-ride-instructions-card";
import { PageFallback } from "@/components/page-fallback";
import { markdownToolLabels } from "@/components/markdown-editor";

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<PageFallback />}>
        <Settings searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Settings({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const { active } = await readActiveScope(searchParams);
  const chapter = active.kind === "chapter" ? active.chapter : null;

  const [dict, language, settings] = await Promise.all([
    getDictionary(),
    getLocale(),
    chapter ? chapters.getSettings(chapter.id) : null,
  ]);
  const strings = dict.admin.settings;

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.settings.title} />
      <div className="grid gap-6">
        {chapter && settings ? (
          <>
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
            <PostRideInstructionsCard
              chapterId={chapter.id}
              value={settings.postRideInstructions}
              language={language}
              labels={{
                markdown: markdownToolLabels(dict),
                ...strings.postRide,
                status: strings.notifications.status,
                field: strings.notifications.field,
              }}
            />
          </>
        ) : (
          <p className="max-w-prose text-sm text-ink-soft">
            {strings.pickChapter}
          </p>
        )}
        <SupportCard strings={strings.support} />
      </div>
    </>
  );
}
