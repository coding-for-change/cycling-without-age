import { Suspense } from "react";
import { AdminPageShell } from "../../_components/admin-page";
import { ChapterBody } from "./_components/chapter-body";
import { PageFallback } from "@/components/page-fallback";
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
      <Suspense fallback={<PageFallback />}>
        <ChapterBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}
