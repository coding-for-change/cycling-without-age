import { Skeleton } from "@/components/ui/skeleton";
import {
  DETAIL_LIST,
  DETAIL_MEDIA,
  DetailLayout,
} from "../../../../_components/detail-page";

const ROWS = ["w-48", "w-40", "w-56", "w-36"];

export function ElementRowsSkeleton() {
  return (
    <div className={DETAIL_LIST}>
      {ROWS.map((width) => (
        <div
          key={width}
          className="flex min-h-12 items-center gap-3 px-3"
        >
          <Skeleton className="size-4" />
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className={`h-4 ${width}`} />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CourseProgressSkeleton() {
  return (
    <div className="grid gap-3 border-t border-line pt-6">
      <div className="grid gap-1.5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="grid gap-3 rounded-xl bg-canvas-deep px-4 py-3">
        <Skeleton className="h-2 rounded-full" />
        <div className="flex flex-wrap gap-5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export function CourseDetailSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-28" />
      <DetailLayout
        header={
          <div className="flex items-start gap-4">
            <Skeleton className={DETAIL_MEDIA} />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>
        }
        sidebar={
          <>
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
          </>
        }
      >
        <div className="grid gap-3">
          <Skeleton className="h-4 w-80 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="grid gap-3 border-t border-line pt-6">
          <div className="flex items-end gap-3">
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
          <ElementRowsSkeleton />
        </div>
        <CourseProgressSkeleton />
      </DetailLayout>
    </>
  );
}
