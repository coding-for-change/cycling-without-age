import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const PROPERTY_BUTTON =
  "h-9 w-full justify-start border-line bg-canvas text-2sm text-ink-soft hover:border-ink-faint hover:bg-canvas hover:text-ink";

export const QUIET_CONTROL =
  "-mx-2 h-8 w-[calc(100%+1rem)] min-w-0 rounded-md border border-transparent bg-transparent px-2 text-2sm text-ink shadow-none outline-none transition-colors hover:bg-canvas-deeper focus-visible:border-line focus-visible:bg-canvas focus-visible:ring-[3px] focus-visible:ring-ring/30";

export const QUIET_COMBOBOX =
  "-mx-2 h-8 w-[calc(100%+1rem)] min-w-0 rounded-md border-transparent bg-transparent text-2sm shadow-none transition-colors hover:bg-canvas-deeper has-[input:focus-visible]:border-line has-[input:focus-visible]:bg-canvas has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/30 [&_input]:px-2 [&_input]:text-2sm";

export function PropertyList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={cn("grid gap-0.5", className)}>{children}</dl>;
}

export function PropertyRow({
  label,
  htmlFor,
  children,
  align = "center",
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div
      className={cn(
        "grid min-h-8 grid-cols-[6.5rem_minmax(0,1fr)] gap-3 text-2sm",
        align === "center" ? "items-center" : "items-start",
      )}
    >
      <dt
        className={cn("truncate text-ink-soft", align === "start" && "pt-1.5")}
      >
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export function PropertyValue({
  children,
  muted = false,
  className,
}: {
  children: ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "block truncate py-1.5",
        muted && "text-ink-faint",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PropertySelect<V extends string>({
  id,
  value,
  options,
  onChange,
  display,
}: {
  id?: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (next: V) => void;
  display?: (value: V) => ReactNode;
}) {
  return (
    <div className="group/select relative">
      {display ? (
        <div
          aria-hidden
          className={cn(
            QUIET_CONTROL,
            "flex items-center group-hover/select:bg-canvas-deeper group-has-[select:focus-visible]/select:border-line group-has-[select:focus-visible]/select:bg-canvas",
          )}
        >
          {display(value)}
        </div>
      ) : null}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as V)}
        className={
          display
            ? "absolute inset-0 -mx-2 w-[calc(100%+1rem)] cursor-pointer appearance-none opacity-0"
            : cn(QUIET_CONTROL, "cursor-pointer appearance-none pr-7")
        }
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 -right-1 size-3.5 -translate-y-1/2 text-ink-soft opacity-0 transition-opacity group-hover/select:opacity-100 group-focus-within/select:opacity-100 pointer-coarse:opacity-100"
      />
    </div>
  );
}
