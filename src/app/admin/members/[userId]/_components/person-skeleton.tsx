import { Skeleton } from "@/components/ui/skeleton";
import { DETAIL_MEDIA, DetailLayout } from "../../../_components/detail-page";
import { MemberOverviewSkeleton } from "./member-overview-strip";

const ROWS = ["w-40", "w-52", "w-36", "w-44"];
const LINES = ["w-64", "w-52", "w-72"];

export function PersonSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-28" />
      <DetailLayout
        header={
          <div className="flex items-start gap-4">
            <Skeleton className={`${DETAIL_MEDIA} rounded-full`} />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-7 w-56 max-w-full" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
          </div>
        }
        sidebar={<Skeleton className="h-44 rounded-xl" />}
      >
        <MemberOverviewSkeleton />
        <div className="grid gap-4 border-t border-line pt-6">
          <Skeleton className="h-5 w-24" />
          <div className="grid divide-y divide-line rounded-xl border border-line">
            {ROWS.map((width) => (
              <div
                key={width}
                className="flex min-h-12 items-center gap-3 px-4 py-2"
              >
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className={`h-4 ${width} max-w-full`} />
                <Skeleton className="ml-auto h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 border-t border-line pt-6">
          <Skeleton className="h-5 w-20" />
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
