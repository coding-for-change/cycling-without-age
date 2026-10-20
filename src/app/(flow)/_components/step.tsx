import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { StepDots, type StepProgress } from "@/components/step-dots";

export {
  StepDots,
  withStepLabel,
  type StepProgress,
} from "@/components/step-dots";

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
      className="mb-2 text-center text-sm text-red-ink"
    >
      {children}
    </p>
  );
}

export function StepSkeleton() {
  return (
    <Step title={<Skeleton className="h-9 w-3/4" />}>
      <Skeleton className="h-12 w-full" />
    </Step>
  );
}
