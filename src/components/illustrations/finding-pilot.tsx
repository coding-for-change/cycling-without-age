import { Character } from "@/components/character";
import { cn } from "@/lib/utils";
import { TrishawIllustration } from "./trishaw";

export function FindingPilot({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("relative flex items-end justify-center", className)}
    >
      <TrishawIllustration
        wind={false}
        className="w-40"
      />
      <div className="relative -ml-4 mb-1 flex flex-col items-center">
        <span className="mb-1 flex gap-1">
          <span className="size-1.5 rounded-full bg-mint-deep motion-safe:animate-pulse" />
          <span className="size-1.5 rounded-full bg-mint-deep motion-safe:animate-pulse motion-safe:[animation-delay:200ms]" />
          <span className="size-1.5 rounded-full bg-mint-deep motion-safe:animate-pulse motion-safe:[animation-delay:400ms]" />
        </span>
        <Character
          size={64}
          expression="curieux"
          follow={false}
          className="text-mint"
        />
      </div>
    </div>
  );
}
