import { Suspense } from "react";
import { AdminPageShell } from "../../_components/admin-page";
import { ChapterBody } from "./_components/chapter-body";
import {
  CHAPTER_PANELS,
  CHAPTER_SECTIONS,
  DetailSkeleton,
} from "../../_components/detail-skeleton";
import type { AdminSearchParams } from "../../active-scope";

export default function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense
        fallback={
          <DetailSkeleton
            panels={CHAPTER_PANELS}
            sections={CHAPTER_SECTIONS}
          />
        }
      >
        <ChapterBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}
