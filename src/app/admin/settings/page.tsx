import { Suspense, type ReactNode } from "react";
import { cacheLife } from "next/cache";
import { chapters } from "@/features/chapters";
import { SupportCard } from "@/components/report-problem/support-card";
import { Skeleton } from "@/components/ui/skeleton";
import { joinUrl } from "@/lib/app-url";
import { requireAdminScope } from "@/lib/auth-guards";
import { getDictionary, getLocale } from "@/lib/i18n";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { ADMIN_LIFE } from "../admin-viewer";
import { JoinLinkCard } from "./_components/join-link-card";
import { NotificationSettingsCard } from "./_components/notification-settings-card";
import { PostRideInstructionsCard } from "./_components/post-ride-instructions-card";
import { markdownToolLabels } from "@/components/markdown-editor";

type PageProps = { searchParams: Promise<AdminSearchParams> };

const CARDS = ["h-40", "h-72", "h-56"];

export default function SettingsPage({ searchParams }: PageProps) {
  return (
    <AdminPageShell>
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsFrame>
          <Suspense fallback={<SettingsCardsSkeleton />}>
            <ChapterSettings searchParams={searchParams} />
          </Suspense>
        </SettingsFrame>
      </Suspense>
    </AdminPageShell>
  );
}

function SettingsCardsSkeleton() {
  return CARDS.map((height, index) => (
    <Skeleton
      key={index}
      className={`${height} rounded-2xl`}
    />
  ));
}

function SettingsSkeleton() {
  return (
    <>
      <Skeleton className="h-9 w-44" />
      <div className="grid gap-6">
        <SettingsCardsSkeleton />
      </div>
    </>
  );
}

async function SettingsFrame({ children }: { children: ReactNode }) {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const [, dict] = await Promise.all([requireAdminScope(), getDictionary()]);

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.settings.title} />
      <div className="grid gap-6">
        {children}
        <SupportCard strings={dict.admin.settings.support} />
      </div>
    </>
  );
}

async function ChapterSettings({ searchParams }: PageProps) {
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
      <p className="max-w-prose text-sm text-ink-soft">{strings.pickChapter}</p>
    );

  return (
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
  );
}
