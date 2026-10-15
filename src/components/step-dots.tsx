import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

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
