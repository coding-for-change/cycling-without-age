import type { ReactNode } from "react";

export function DetailSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base">{title}</h2>
        {hint ? <p className="text-2sm text-ink-soft">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}
