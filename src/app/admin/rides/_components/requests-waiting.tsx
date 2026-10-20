import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { rideRequests } from "@/features/ride-requests";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";

/** The week says how many Ride Requests wait for a decision, and takes you there. */
export async function RequestsWaiting({
  chapterIds,
  scopeQuery,
}: {
  chapterIds: string[];
  scopeQuery: string;
}) {
  const [waiting, dict, language] = await Promise.all([
    rideRequests.countPending(chapterIds),
    getDictionary(),
    getLocale(),
  ]);
  if (!waiting) return null;

  return (
    <Link
      href={`/admin/rides/requests${scopeQuery}`}
      className="inline-flex min-h-8 w-fit items-center gap-2 rounded-full bg-mint-tint px-3 text-2sm font-medium text-ink transition-colors hover:bg-mint focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
    >
      <Inbox
        aria-hidden
        className="size-4 text-mint-ink"
      />
      {formatMessage(
        dict.admin.rideRequests.waiting,
        { count: waiting },
        language,
      )}
      <ArrowRight
        aria-hidden
        className="size-3.5"
      />
    </Link>
  );
}
