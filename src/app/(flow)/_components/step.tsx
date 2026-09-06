import type { ReactNode } from "react";
import { cn, fill } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type StepProgress = {
  index: number;
  total: number;
  /** "Step {current} of {total}" — the only thing a screen reader gets, since the
   *  dots themselves say nothing out loud. */
  label: string;
};

export function Step({
  title,
  description,
  children,
  action,
  progress,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  progress?: StepProgress;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "flex flex-1 flex-col lg:grid lg:grid-cols-2 lg:items-center",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-md flex-1 flex-col",
          "px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))]",
          "lg:px-10 lg:py-10",
        )}
      >
        {progress && (
          <StepDots
            {...progress}
            className="mb-6"
          />
        )}
        <h1 className="text-3xl leading-tight tracking-tight text-balance">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-base text-ink-soft">{description}</p>
        )}
        <div className="flex flex-1 flex-col justify-center py-8 lg:flex-none">
          {children}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </main>
  );
}

export function StepDots({
  index,
  total,
  label,
  className,
}: StepProgress & { className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={index + 1}
      aria-valuetext={fill(label, { current: index + 1, total })}
      className={cn("flex items-center justify-center gap-2", className)}
    >
      {Array.from({ length: total }, (_, dot) => (
        <span
          key={dot}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none",
            dot === index ? "w-6 bg-mint-deep" : "w-1.5 bg-ink-faint",
          )}
        />
      ))}
    </div>
  );
}

/** Matches the Step frame so the streamed content does not shift the layout. */
export function StepSkeleton() {
  return (
    <Step title={<Skeleton className="h-9 w-3/4" />}>
      <Skeleton className="h-12 w-full" />
    </Step>
  );
}
