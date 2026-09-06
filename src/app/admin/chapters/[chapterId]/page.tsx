import { Suspense } from "react";
import {
  AdminPageFallback,
  AdminPageShell,
} from "../../_components/admin-page";
import { ChapterBody } from "./_components/chapter-body";

export default function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<AdminPageFallback />}>
        <ChapterBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}
