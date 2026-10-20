import { Suspense } from "react";
import { AdminPageShell } from "../../../_components/admin-page";
import type { AdminSearchParams } from "../../../active-scope";
import { CourseBody } from "./_components/course-body";
import { CourseDetailSkeleton } from "./_components/course-skeleton";
import { ElementModalSlot } from "./_components/element-modal-slot";

type PageProps = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<AdminSearchParams>;
};

export default function CoursePage({ params, searchParams }: PageProps) {
  return (
    <AdminPageShell>
      <Suspense fallback={<CourseDetailSkeleton />}>
        <CourseBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
      <Suspense fallback={null}>
        <ElementModal
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}

async function ElementModal({ params, searchParams }: PageProps) {
  const { courseId } = await params;
  return (
    <ElementModalSlot
      courseId={courseId}
      searchParams={searchParams}
    />
  );
}
