import Link from "next/link";
import { ArrowLeft, Info, type LucideIcon } from "lucide-react";
import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from "react";
import { SaveStatus, SaveStatusProvider } from "@/components/save-status";
import { Badge } from "@/components/ui/badge";
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
  meta,
  action,
  busy,
  children,
  className,
  bordered = true,
}: {
  title?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  busy?: boolean;
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  const heading =
    title || description ? (
      <div className="grid min-w-0 flex-1 gap-1">
        {title ? <h2 className="text-base font-medium">{title}</h2> : null}
        {description ? (
          <p className="max-w-prose text-2sm text-ink-soft">{description}</p>
        ) : null}
      </div>
    ) : null;

  return (
    <section
      aria-busy={busy}
      className={cn(
        "grid gap-4",
        bordered && "border-t border-line pt-6",
        className,
      )}
    >
      {meta || action ? (
        <div className="flex items-end gap-3">
          {heading}
          {meta ? (
            <span className="pb-0.5 text-2sm text-ink-soft tabular-nums">
              {meta}
            </span>
          ) : null}
          {action}
        </div>
      ) : (
        heading
      )}
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

export function DetailEditorShell({
  header,
  panels,
  children,
}: {
  header: ReactNode;
  panels: ReactNode;
  children: ReactNode;
}) {
  return (
    <SaveStatusProvider>
      <DetailLayout
        header={header}
        sidebar={panels}
      >
        {children}
      </DetailLayout>
    </SaveStatusProvider>
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
  children?: ReactNode;
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

export function DetailHeaderActions({
  saveStatus,
  children,
}: {
  saveStatus?: { labels: { saving: string; saved: string }; words: string };
  children?: ReactNode;
}) {
  if (!saveStatus && !children) return null;
  return (
    <div className="flex min-h-8 flex-col items-end gap-1">
      {saveStatus ? <SaveStatus {...saveStatus} /> : null}
      {children}
    </div>
  );
}

export function MetaBadge({ className, ...props }: ComponentProps<"span">) {
  return (
    <Badge
      className={cn("bg-mint-tint font-normal text-ink", className)}
      {...props}
    />
  );
}

export function DetailMeta({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const items = Children.toArray(children);
  const isBadge = (item: unknown) =>
    isValidElement(item) && item.type === MetaBadge;

  return (
    <div className={cn("overflow-hidden text-2sm text-ink-soft", className)}>
      <div className="-ml-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-2"
          >
            <span
              aria-hidden
              className={cn(
                "w-1 text-center",
                (isBadge(item) || isBadge(items[index - 1])) && "invisible",
              )}
            >
              ·
            </span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

const MEDIA_TONE = {
  mint: "bg-mint-tint text-ink",
  deep: "bg-canvas-deeper text-ink",
  muted: "bg-canvas-deep text-ink-faint",
} as const;

export function DetailMediaIcon({
  icon: Icon,
  tone = "mint",
}: {
  icon: LucideIcon;
  tone?: keyof typeof MEDIA_TONE;
}) {
  return (
    <span
      aria-hidden
      className={cn(DETAIL_MEDIA, "grid place-items-center", MEDIA_TONE[tone])}
    >
      <Icon className="size-5" />
    </span>
  );
}

export function DetailNotice({
  icon: Icon = Info,
  tone = "info",
  children,
}: {
  icon?: LucideIcon;
  tone?: "info" | "muted";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl px-4 py-3 text-2sm",
        tone === "info" ? "bg-mint-tint" : "bg-canvas-deep",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "muted" && "text-ink-soft",
        )}
      />
      <div className="grid min-w-0 flex-1 gap-1">{children}</div>
    </div>
  );
}

export function DetailEmpty({
  variant = "section",
  action,
  children,
}: {
  variant?: "panel" | "section";
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-line text-2sm text-ink-soft",
        variant === "panel"
          ? "grid gap-2 px-3 py-2"
          : "flex min-h-20 flex-col items-center justify-center gap-2 p-4 text-center",
      )}
    >
      <p>{children}</p>
      {action}
    </div>
  );
}

export const DETAIL_LIST =
  "grid divide-y divide-line overflow-hidden rounded-lg border border-line";

const LIST_ROW = "flex min-h-10 items-center gap-3 px-3 py-1.5 text-2sm";

export function DetailList({
  ordered = false,
  busy,
  children,
}: {
  ordered?: boolean;
  busy?: boolean;
  children: ReactNode;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <List
      aria-busy={busy}
      className={DETAIL_LIST}
    >
      {children}
    </List>
  );
}

export function DetailListRow({
  href,
  className,
  children,
}: {
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  return href ? (
    <li>
      <Link
        href={href}
        className={cn(
          LIST_ROW,
          "transition-colors hover:bg-canvas-deep",
          className,
        )}
      >
        {children}
      </Link>
    </li>
  ) : (
    <li className={cn(LIST_ROW, className)}>{children}</li>
  );
}

export const DETAIL_TITLE =
  "font-display text-xl leading-tight font-bold tracking-tight md:text-2xl";

export const DETAIL_MEDIA = "size-14 shrink-0 rounded-xl";
