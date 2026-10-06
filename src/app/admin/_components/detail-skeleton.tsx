import { Skeleton } from "@/components/ui/skeleton";
import { DETAIL_LIST, DETAIL_MEDIA, DetailLayout } from "./detail-page";

const LINES = ["w-64", "w-52", "w-72", "w-44"];
const ROWS = ["w-40", "w-32", "w-44"];

export function DetailSkeleton({
  headerAction = false,
  panels = ["h-56", "h-28"],
  sections = ["text"],
}: {
  headerAction?: boolean;
  panels?: string[];
  sections?: ("text" | "list")[];
}) {
  return (
    <>
      <Skeleton className="h-5 w-28" />
      <DetailLayout
        header={
          <div className="flex items-start gap-4">
            <Skeleton className={DETAIL_MEDIA} />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-44" />
            </div>
            {headerAction ? <Skeleton className="size-8 rounded-md" /> : null}
          </div>
        }
        sidebar={panels.map((height, index) => (
          <Skeleton
            key={index}
            className={`${height} rounded-xl`}
          />
        ))}
      >
        {sections.map((kind, index) => (
          <div
            key={index}
            className="grid gap-3 border-t border-line pt-6"
          >
            <Skeleton className="h-5 w-36" />
            {kind === "list" ? (
              <div className={DETAIL_LIST}>
                {ROWS.map((width) => (
                  <div
                    key={width}
                    className="flex min-h-10 items-center gap-3 px-3"
                  >
                    <Skeleton className="size-4" />
                    <Skeleton className={`h-4 ${width}`} />
                  </div>
                ))}
              </div>
            ) : (
              LINES.map((width) => (
                <Skeleton
                  key={width}
                  className={`h-4 ${width} max-w-full`}
                />
              ))
            )}
          </div>
        ))}
      </DetailLayout>
    </>
  );
}
