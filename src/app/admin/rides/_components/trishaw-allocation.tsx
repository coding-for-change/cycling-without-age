import { headers } from "next/headers";
import { rides } from "@/features/rides";
import { requireChapterAdmin } from "@/lib/auth-guards";
import {
  formatDateTime,
  formatTime,
  resolveLocale,
  wordsLocale,
} from "@/lib/format";
import { trishawSummary } from "@/components/trishaw-summary";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { allocationChoices } from "@/use-cases/schedule-ride";
import type { AdminSearchParams } from "../../active-scope";
import {
  AllocateTrishawsDrawer,
  type AllocationOption,
} from "./allocate-trishaws-drawer";
import { ALLOCATION_PARAM } from "./allocation-param";

export async function TrishawAllocation({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const raw = params[ALLOCATION_PARAM];
  const rideId = Array.isArray(raw) ? raw[0] : raw;
  if (!rideId || rideId.length > 64) return null;

  const ride = await rides.getRide(rideId);
  if (ride) await requireChapterAdmin(ride.chapterId);

  const [choices, dict, language, head] = await Promise.all([
    ride ? allocationChoices(rideId) : null,
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
    errors: common.errors,
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

  const options: AllocationOption[] = choices.trishaws.map((trishaw) => {
    const allocated = allocatedIds.has(trishaw.id);
    const busy = choices.busy[trishaw.id] === true;
    const grounded = trishaw.damages.some((damage) => damage.grounding);
    const ready = trishaw.status === "active" && !grounded;
    const notReady =
      trishaw.status === "active"
        ? common.grounded
        : common.statuses[trishaw.status];
    return {
      ...trishawSummary(trishaw, dict, words),
      allocated,
      blocked: !ready ? notReady : busy ? allocation.booked : null,
      warning: allocated
        ? !ready
          ? `${notReady} · ${allocation.kept}`
          : busy
            ? allocation.booked
            : null
        : null,
      damaged: !grounded && trishaw.damages.length > 0,
    };
  });

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
      options={options}
      labels={labels}
      locale={language}
    />
  );
}
