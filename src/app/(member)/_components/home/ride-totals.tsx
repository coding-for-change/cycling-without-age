import { Bike, Heart, Sun, type LucideIcon } from "lucide-react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { formatNumber, resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { passengerRideTotals } from "@/use-cases/passenger-rides";
import { MEMBER_LIFE } from "../instant";

function Tile({
  value,
  label,
  icon: Icon,
  small = false,
  className,
}: {
  value: string;
  small?: boolean;
  label: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-(--r-tile) p-5 text-ink",
        className,
      )}
    >
      <p
        className={cn(
          "display-title tabular-nums",
          small ? "text-xl" : "text-3xl",
        )}
      >
        {value}
      </p>
      <p className="text-sm font-bold opacity-75">{label}</p>
      <Icon
        aria-hidden
        className="pointer-events-none absolute -right-1.25 -bottom-2.75 size-18 opacity-20"
      />
    </div>
  );
}

/**
 * A quiet, honest sense of scale (mockup 2): how often the passenger's riders
 * have been out, and for how long — or, before the first ride, that it waits.
 */
export async function RideTotals() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await perspectiveViewerSession("passenger");
  if (!session) return null;
  const [totals, dict, language, head] = await Promise.all([
    passengerRideTotals(session.user.id),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const s = dict.member.home.passenger.totals;
  const notation = resolveLocale(head.get("accept-language"));
  const hours = Math.round(totals.seconds / 3600);
  const say = (template: string, count: number) =>
    formatMessage(template, { count }, language);

  if (totals.rides === 0)
    return (
      <Tile
        value={s.first}
        label={s.firstHint}
        icon={Heart}
        small
        className="reveal bg-mint-tint [--i:4]"
      />
    );

  return (
    <div className="reveal grid grid-cols-2 gap-3 [--i:4]">
      <Tile
        value={formatNumber(totals.rides, notation)}
        label={say(s.rides, totals.rides)}
        icon={Bike}
        className="bg-mint-tint"
      />
      <Tile
        value={formatNumber(hours, notation)}
        label={say(s.hours, hours)}
        icon={Sun}
        className="bg-grey-tint"
      />
    </div>
  );
}
