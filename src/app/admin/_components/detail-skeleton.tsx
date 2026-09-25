import { Skeleton } from "@/components/ui/skeleton";
import { DETAIL_MEDIA, DetailLayout } from "./detail-page";

const LINES = ["w-64", "w-52", "w-72", "w-44"];

export function DetailSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-28" />
      <DetailLayout
        header={
          <div className="flex items-start gap-4">
            <Skeleton className={DETAIL_MEDIA} />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        }
        sidebar={
          <>
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </>
        }
      >
        <div className="grid gap-3 border-t border-line pt-6">
          <Skeleton className="h-5 w-36" />
          {LINES.map((width) => (
            <Skeleton
              key={width}
              className={`h-4 ${width} max-w-full`}
            />
          ))}
        </div>
      </DetailLayout>
    </>
  );
}
