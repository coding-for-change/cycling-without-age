import { Skeleton } from "@/components/ui/skeleton";

const OUTLINE_ROWS = ["w-40", "w-32", "w-44", "w-36", "w-28"];

export function OutlineSkeleton() {
  return (
    <div className="grid gap-3 rounded-(--r-tile) border border-line bg-canvas p-3">
      <div className="grid gap-2 px-2 pt-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-48" />
      </div>
      <OutlineRowsSkeleton />
    </div>
  );
}

export function OutlineRowsSkeleton({
  rows = OUTLINE_ROWS,
}: {
  rows?: string[];
}) {
  return (
    <div className="grid gap-1">
      {rows.map((width, index) => (
        <div
          key={index}
          className="flex min-h-13 items-center gap-3 px-3 py-2.5"
        >
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="grid gap-1.5">
            <Skeleton className={`h-4 ${width}`} />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReadinessHeaderSkeleton() {
  return (
    <div className="grid gap-4 rounded-(--r-tile) border border-line bg-canvas p-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-21 shrink-0 rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-6 w-56 max-w-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

export function TrainingHeaderSkeleton() {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-(--r-tile) border border-line bg-canvas">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="grid gap-2 p-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-1 h-1.5 w-full rounded-full" />
      </div>
    </div>
  );
}

export function TrainingHomeSkeleton() {
  return (
    <>
      <TrainingHeaderSkeleton />
      <ReadinessHeaderSkeleton />
      <section className="grid gap-3">
        <Skeleton className="h-3.5 w-20" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </div>
      </section>
      <section className="grid gap-3">
        <Skeleton className="h-3.5 w-16" />
        <div className="flex items-start gap-4 rounded-(--r-tile) border border-line bg-canvas p-4">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
        </div>
      </section>
    </>
  );
}

export function CourseOverviewSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-20" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
        <div className="grid gap-6">
          <Skeleton className="aspect-video w-full rounded-(--r-tile)" />
          <div className="grid gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-12 w-full rounded-full sm:w-48" />
        </div>
        <div className="grid gap-2 lg:rounded-(--r-tile) lg:border lg:border-line lg:p-4">
          <Skeleton className="h-5 w-24" />
          <OutlineRowsSkeleton />
        </div>
      </div>
    </>
  );
}

export function LessonSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="aspect-video w-full rounded-none lg:rounded-2xl" />
      <div className="grid gap-2 px-4 lg:px-0">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

export function QuizSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-xl gap-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
      </div>
      <div className="grid justify-items-center gap-5 rounded-(--r-tile) bg-mint-tint px-5 pt-8 pb-6">
        <Skeleton className="size-28 rounded-full" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-12 w-full max-w-xs rounded-full" />
      </div>
    </div>
  );
}
