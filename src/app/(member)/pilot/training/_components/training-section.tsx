import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TrainingSection({
  title,
  columns = 2,
  children,
}: {
  title: string;
  columns?: 1 | 2;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <h2 className="text-xs font-medium tracking-wide text-ink-soft uppercase">
        {title}
      </h2>
      <div
        className={cn(
          "grid gap-4",
          columns === 2 && "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {children}
      </div>
    </section>
  );
}
