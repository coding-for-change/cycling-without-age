import { headers } from "next/headers";
import { rides } from "@/features/rides";
import { requireChapterAdmin } from "@/lib/auth-guards";
import {
  formatDateTime,
  formatTime,
  resolveLocale,
  wordsLocale,
} from "@/lib/format";
import { trishawOptions } from "@/features/rides/components/trishaw-options";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { allocationChoices } from "@/use-cases/schedule-ride";
import type { AdminSearchParams } from "../../active-scope";
import { AllocateTrishawsDrawer } from "./allocate-trishaws-drawer";
import { ALLOCATION_OPEN, ALLOCATION_PARAM } from "./allocation-param";

/**
 * Rendered by the ride's detail page; the drawer only loads its options while
 * `?trishaws=1` asks for it, and only for a ride that can still change.
 */
export async function TrishawAllocation({
  params,
  searchParams,
}: {
  params: Promise<{ rideId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ rideId }, query] = await Promise.all([params, searchParams]);
  const raw = query[ALLOCATION_PARAM];
  if ((Array.isArray(raw) ? raw[0] : raw) !== ALLOCATION_OPEN) return null;

  const ride = await rides.getRide(rideId);
  if (!ride || ride.status !== "scheduled") return null;
  await requireChapterAdmin(ride.chapterId);

  const [choices, dict, language, head] = await Promise.all([
    allocationChoices(rideId),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const { common, allocation } = dict.fleet;
  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);

  const labels = {
    ...allocation,
    pool: common.pool,
    wheelchair: common.wheelchair,
    damaged: common.damaged,
    errors: { ...common.errors, ...dict.rides.errors },
  };

  if (!choices)
    return (
      <AllocateTrishawsDrawer
        key={rideId}
        rideId={rideId}
        description={null}
        options={null}
        labels={labels}
        locale={language}
      />
    );

  const zone = choices.ride.chapter.timeZone;
  const allocatedIds = new Set(
    choices.ride.trishaws.map(({ trishaw }) => trishaw.id),
  );

  return (
    <AllocateTrishawsDrawer
      key={rideId}
      rideId={rideId}
      description={formatMessage(
        allocation.description,
        {
          when: `${formatDateTime(choices.ride.startsAt, locale, zone)} – ${formatTime(choices.ride.endsAt, locale, zone)}`,
          chapter: choices.ride.chapter.name,
        },
        words,
      )}
      options={trishawOptions(choices, allocatedIds, dict, words)}
      labels={labels}
      locale={language}
    />
  );
}
