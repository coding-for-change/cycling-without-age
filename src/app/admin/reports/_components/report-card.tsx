import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ReportCard({
  title,
  meta,
  action,
  children,
  className,
}: {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-canvas p-4 md:p-5",
        className,
      )}
    >
      <header className="flex min-h-8 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h2
            id={id}
            className="truncate text-sm font-medium tracking-tight"
          >
            {title}
          </h2>
          {meta ? <p className="text-xs text-ink-soft">{meta}</p> : null}
        </div>
        {action ? (
          <div className="flex items-center gap-2">{action}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}
