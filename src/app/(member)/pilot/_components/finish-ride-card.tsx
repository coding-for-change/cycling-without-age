import Link from "next/link";
import { ArrowRight, Flag } from "lucide-react";
import { rides } from "@/features/rides";
import { requirePerspective } from "@/lib/auth-guards";
import { formatRelativeTime, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";

export async function FinishRideCard() {
  const session = await requirePerspective("pilot");
  const [ride, dict, language] = await Promise.all([
    rides.latestRideForPilot(session.user.id),
    getDictionary(),
    getLocale(),
  ]);
  if (!ride) return null;

  const { homeCard } = dict.fleet.finish;

  return (
    <Link
      href={`/pilot/rides/${ride.id}/finish`}
      className="flex items-center gap-4 rounded-2xl border border-mint bg-mint-tint p-4 transition-colors hover:bg-mint motion-reduce:transition-none"
    >
      <Flag
        className="size-5 shrink-0 text-ink"
        aria-hidden
      />
      <span className="min-w-0">
        <span className="block font-medium">{homeCard.title}</span>
        <span className="block text-sm text-ink-soft">
          <time dateTime={ride.startsAt.toISOString()}>
            {formatRelativeTime(ride.startsAt, wordsLocale(language))}
          </time>
          {" · "}
          {homeCard.body}
        </span>
      </span>
      <ArrowRight
        className="ml-auto size-4 shrink-0 text-ink-soft"
        aria-hidden
      />
    </Link>
  );
}
