import { cn } from "@/lib/utils";

const TONES = {
  mint: "bg-mint",
  deep: "bg-mint-deep",
  faint: "bg-ink-faint",
};

export function ShareBar({
  value,
  max,
  tone = "mint",
  thin = false,
}: {
  value: number;
  max: number;
  tone?: keyof typeof TONES;
  thin?: boolean;
}) {
  const share = max > 0 && value > 0 ? Math.max((value / max) * 100, 2) : 0;
  return (
    <span
      aria-hidden
      className={cn(
        "block overflow-hidden rounded-full bg-canvas-deep",
        thin ? "h-1" : "h-2",
      )}
    >
      <span
        style={{ width: `${share}%` }}
        className={cn(
          "block h-full rounded-full transition-[width,background-color] duration-500 motion-reduce:transition-none",
          TONES[tone],
        )}
      />
    </span>
  );
}
