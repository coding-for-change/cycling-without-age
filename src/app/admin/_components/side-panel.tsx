import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SidePanel({
  title,
  meta,
  action,
  defaultOpen = true,
  className,
  children,
}: {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn("group rounded-xl bg-canvas-deep", className)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-xl px-4 py-2 outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <h2 className="py-1 text-2sm font-medium">{title}</h2>
        <ChevronRight
          aria-hidden
          className="size-3.5 text-ink-soft transition-transform group-open:rotate-90"
        />
        {meta || action ? (
          <span className="-mr-2 ml-auto flex items-center gap-1">
            {meta ? (
              <span className="text-2sm text-ink-soft tabular-nums">
                {meta}
              </span>
            ) : null}
            {action}
          </span>
        ) : null}
      </summary>
      <div className="grid gap-4 px-4 pb-4">{children}</div>
    </details>
  );
}

export function PanelAddButton({
  label,
  className,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      className={cn("size-7 text-ink-soft hover:text-ink", className)}
      {...props}
    >
      <Plus aria-hidden />
    </Button>
  );
}

export function CountMeta({
  count,
  max,
  srLabel,
  highlight = false,
}: {
  count: number;
  max: number | null;
  srLabel: string;
  highlight?: boolean;
}) {
  return (
    <span className={cn(highlight && "text-ink")}>
      <span aria-hidden>{max === null ? count : `${count} / ${max}`}</span>
      <span className="sr-only">{srLabel}</span>
    </span>
  );
}

export function RowRemoveButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="size-7 shrink-0 text-ink-soft opacity-0 transition-opacity group-hover/row:opacity-100 hover:text-ink focus-visible:opacity-100 pointer-coarse:opacity-100"
    >
      <X aria-hidden />
    </Button>
  );
}

export function PanelItem({
  href,
  leading,
  label,
  badge,
  onRemove,
  removeLabel,
  disabled,
}: {
  href: string;
  leading: ReactNode;
  label: string;
  badge?: ReactNode;
  onRemove?: () => void;
  removeLabel: string;
  disabled?: boolean;
}) {
  return (
    <li className="group/row flex min-h-8 items-center gap-2">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-2sm underline-offset-2 hover:underline"
      >
        {leading}
        <span className="truncate">{label}</span>
        {badge}
      </Link>
      {onRemove ? (
        <RowRemoveButton
          label={removeLabel}
          disabled={disabled}
          onClick={onRemove}
        />
      ) : null}
    </li>
  );
}
