import type { ComponentProps, ReactNode } from "react";
import { ArrowUpRight, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsRowTone = "default" | "action" | "destructive";

export function SettingsGroup({
  label,
  footer,
  children,
  className,
}: {
  label?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid min-w-0 gap-1.25", className)}>
      {label ? (
        <h3 className="px-4 text-2sm font-medium text-ink-soft">{label}</h3>
      ) : null}
      <ul className="overflow-hidden rounded-(--r-card) bg-canvas divide-y divide-line [&>li]:px-4">
        {children}
      </ul>
      {footer ? (
        <div className="grid gap-1 px-4 text-2sm text-ink-soft">{footer}</div>
      ) : null}
    </section>
  );
}

export function SettingsItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li className={cn("flex min-h-11 min-w-0 items-center gap-3", className)}>
      {children}
    </li>
  );
}

type RowContent = {
  label: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  icon?: LucideIcon;
  chevron?: boolean;
  tone?: SettingsRowTone;
};

const TONES: Record<SettingsRowTone, string> = {
  default: "text-ink",
  action: "text-mint-deep",
  destructive: "text-red",
};

const rowClass = (tone: SettingsRowTone, className?: string) =>
  cn(
    "-mx-4 flex min-h-11 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors motion-reduce:transition-none",
    "hover:bg-canvas-deep focus-visible:bg-canvas-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-inset",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    TONES[tone],
    className,
  );

function RowInner({
  label,
  subtitle,
  value,
  icon: Icon,
  trailing,
  tone,
}: RowContent & { trailing?: ReactNode; tone: SettingsRowTone }) {
  return (
    <>
      {Icon ? (
        <Icon
          aria-hidden
          className={cn(
            "size-4 shrink-0",
            tone === "default" && "text-ink-soft",
          )}
        />
      ) : null}
      <span className="grid min-w-0 flex-1">
        <span className="truncate">{label}</span>
        {subtitle ? (
          <span className="truncate text-2sm font-normal text-ink-soft">
            {subtitle}
          </span>
        ) : null}
      </span>
      {value ? (
        <span className="max-w-1/2 truncate font-normal text-ink-soft">
          {value}
        </span>
      ) : null}
      {trailing}
    </>
  );
}

export function SettingsRowButton({
  label,
  subtitle,
  value,
  icon,
  chevron = false,
  tone = "default",
  className,
  type = "button",
  ...props
}: RowContent & Omit<ComponentProps<"button">, "value">) {
  return (
    <button
      type={type}
      className={rowClass(tone, className)}
      {...props}
    >
      <RowInner
        label={label}
        subtitle={subtitle}
        value={value}
        icon={icon}
        tone={tone}
        trailing={
          chevron ? (
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-ink-faint"
            />
          ) : null
        }
      />
    </button>
  );
}

export function SettingsRowLink({
  label,
  subtitle,
  value,
  icon,
  chevron = false,
  tone = "default",
  external = false,
  className,
  ...props
}: RowContent & { external?: boolean } & ComponentProps<"a">) {
  return (
    <a
      className={rowClass(tone, className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    >
      <RowInner
        label={label}
        subtitle={subtitle}
        value={value}
        icon={icon}
        tone={tone}
        trailing={
          external ? (
            <ArrowUpRight
              aria-hidden
              className="size-4 shrink-0 text-ink-faint"
            />
          ) : chevron ? (
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-ink-faint"
            />
          ) : null
        }
      />
    </a>
  );
}

export function SettingsRow(
  props: RowContent & Omit<ComponentProps<"button">, "value">,
) {
  return (
    <SettingsItem>
      <SettingsRowButton {...props} />
    </SettingsItem>
  );
}
