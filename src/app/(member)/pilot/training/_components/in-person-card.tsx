import { Check, Hourglass, Users } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

export function InPersonCard({
  confirmedOn,
  strings,
  language,
}: {
  confirmedOn: string | null;
  strings: Dictionary["pilot"]["training"]["inPerson"];
  language: string;
}) {
  const confirmed = confirmedOn !== null;

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-(--r-tile) p-4",
        confirmed ? "bg-mint-tint" : "border border-line bg-canvas",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-full",
          confirmed ? "bg-mint-deep text-white" : "bg-canvas-deep text-ink",
        )}
      >
        {confirmed ? (
          <Check
            className="size-5"
            strokeWidth={3}
          />
        ) : (
          <Users className="size-5" />
        )}
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="font-display text-base leading-snug font-bold">
          {strings.title}
        </p>
        {confirmed ? (
          <p className="text-sm text-ink-soft">
            {formatMessage(strings.confirmed, { date: confirmedOn }, language)}
          </p>
        ) : (
          <>
            <p className="flex items-center gap-1.25 text-sm font-medium">
              <Hourglass
                aria-hidden
                className="size-3.5 shrink-0 text-ink-soft"
              />
              {strings.waiting}
            </p>
            <p className="text-sm text-ink-soft">{strings.hint}</p>
          </>
        )}
      </div>
    </div>
  );
}
