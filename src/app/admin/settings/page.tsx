import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getDictionary } from "@/lib/i18n";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { DetailList, DetailListRow } from "../_components/detail-page";
import { ChapterLogo } from "../chapters/_components/chapter-logo";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { chapterHref } from "../nav";

type PageProps = { searchParams: Promise<AdminSearchParams> };

const ROWS = ["w-40", "w-32", "w-44"];

export default function MyChapterPage({ searchParams }: PageProps) {
  return (
    <AdminPageShell>
      <Suspense fallback={<PickerSkeleton />}>
        <MyChapter searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

function PickerSkeleton() {
  return (
    <div className="grid max-w-xl gap-4">
      <Skeleton className="h-9 w-44" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="grid gap-1">
        {ROWS.map((width) => (
          <Skeleton
            key={width}
            className={`h-10 ${width}`}
          />
        ))}
      </div>
    </div>
  );
}

async function MyChapter({ searchParams }: PageProps) {
  const { active, chapters } = await readActiveScope(searchParams);
  const only =
    active.kind === "chapter"
      ? active.chapter
      : chapters.length === 1
        ? chapters[0]
        : null;
  if (only) redirect(chapterHref(only.id));

  const strings = (await getDictionary()).admin.pages.myChapter;

  return (
    <div className="grid max-w-xl gap-4">
      <AdminPageHeader title={strings.title} />
      <p className="text-sm text-ink-soft">{strings.body}</p>
      <DetailList>
        {chapters.map((chapter) => (
          <DetailListRow
            key={chapter.id}
            href={chapterHref(chapter.id)}
          >
            <ChapterLogo
              logo={null}
              name={chapter.name}
              className="size-6 rounded-md text-xs"
            />
            <span className="min-w-0 flex-1 truncate">{chapter.name}</span>
            <ChevronRight
              aria-hidden
              className="size-4 text-ink-soft"
            />
          </DetailListRow>
        ))}
      </DetailList>
    </div>
  );
}
