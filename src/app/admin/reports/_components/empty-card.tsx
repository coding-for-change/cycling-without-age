import type { LucideIcon } from "lucide-react";
import { CalendarRange, ChartNoAxesColumn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReportLink } from "./report-nav";

export type EmptyCardStrings = {
  title: string;
  body: string;
  showYear?: string;
};

const SHOW_YEAR_PATCH = { range: "12m", from: null, to: null };

export function EmptyCard({
  icon: Icon = ChartNoAxesColumn,
  title,
  body,
  showYear,
  className,
}: EmptyCardStrings & {
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-48 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-canvas-deep/60 px-5 py-8 text-center",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[repeating-linear-gradient(135deg,var(--line)_0_1px,transparent_1px_12px)] opacity-60 [mask-image:linear-gradient(to_top,black,transparent)]"
      />
      <span
        aria-hidden
        className="relative grid size-11 place-items-center rounded-full bg-mint-tint text-mint-deep"
      >
        <Icon className="size-5" />
      </span>
      <div className="relative flex max-w-sm flex-col gap-1">
        <p className="text-sm font-medium text-balance">{title}</p>
        <p className="text-2sm text-ink-soft">{body}</p>
      </div>
      {showYear ? (
        <ReportLink
          patch={SHOW_YEAR_PATCH}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "relative gap-2 rounded-full border-line bg-canvas",
          )}
        >
          <CalendarRange
            aria-hidden
            className="size-4"
          />
          {showYear}
        </ReportLink>
      ) : null}
    </div>
  );
}
