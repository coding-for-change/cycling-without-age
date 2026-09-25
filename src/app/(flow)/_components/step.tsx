import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatMessage } from "@/lib/i18n/format";
import { Skeleton } from "@/components/ui/skeleton";

export type StepProgress = {
  index: number;
  total: number;
  label: string;
};

export function withStepLabel(
  at: { index: number; total: number },
  template: string,
  locale: string,
): StepProgress {
  return {
    ...at,
    label: formatMessage(
      template,
      { current: at.index + 1, total: at.total },
      locale,
    ),
  };
}

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
          "px-6 pt-(--flow-top) pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          "lg:px-10 lg:py-10",
        )}
      >
        <div
          className={cn(
            "mb-6 flex h-(--flow-bar) items-center justify-center lg:h-auto",
            !progress && "lg:hidden",
          )}
        >
          {progress && <StepDots {...progress} />}
        </div>
        <h1 className="text-3xl leading-tight tracking-tight text-balance">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-base break-words text-ink-soft [overflow-wrap:anywhere]">
            {description}
          </p>
        )}
        <div className="flex flex-1 flex-col justify-center py-8 lg:flex-none">
          {children}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </main>
  );
}

export function StepError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="mb-2 text-center text-sm text-red"
    >
      {children}
    </p>
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
      aria-valuetext={label}
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

export function StepSkeleton() {
  return (
    <Step title={<Skeleton className="h-9 w-3/4" />}>
      <Skeleton className="h-12 w-full" />
    </Step>
  );
}
