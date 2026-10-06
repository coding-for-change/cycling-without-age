import { Suspense } from "react";
import { AdminPageShell } from "../../_components/admin-page";
import { ChapterBody } from "./_components/chapter-body";
import { DetailSkeleton } from "../../_components/detail-skeleton";
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
            panels={["h-28", "h-24", "h-56"]}
            sections={["text", "text"]}
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
