import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 w-fit items-center gap-2 text-2sm text-ink-soft hover:text-ink"
    >
      <ArrowLeft
        aria-hidden
        className="size-4"
      />
      {label}
    </Link>
  );
}

export function DetailSection({
  title,
  description,
  children,
  className,
  bordered = true,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <section
      className={cn(
        "grid gap-4",
        bordered && "border-t border-line pt-6",
        className,
      )}
    >
      {title || description ? (
        <div className="grid gap-1">
          {title ? <h2 className="text-base font-medium">{title}</h2> : null}
          {description ? (
            <p className="max-w-prose text-2sm text-ink-soft">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function DetailLayout({
  header,
  sidebar,
  children,
}: {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:grid-rows-[auto_1fr] lg:gap-x-12">
      {header}
      <aside className="grid content-start gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {sidebar}
      </aside>
      <div className="grid content-start gap-6 lg:col-start-1">{children}</div>
    </div>
  );
}

export function DetailHeader({
  media,
  title,
  children,
  aside,
}: {
  media: ReactNode;
  title: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start gap-4">
      {media}
      <div className="grid min-w-0 flex-1 gap-1">
        <h1 className="leading-none">{title}</h1>
        {children}
      </div>
      {aside ? <div className="ml-auto">{aside}</div> : null}
    </header>
  );
}

export const DETAIL_TITLE =
  "font-display text-xl leading-tight font-bold tracking-tight md:text-2xl";

export const DETAIL_MEDIA = "size-14 shrink-0 rounded-xl";
