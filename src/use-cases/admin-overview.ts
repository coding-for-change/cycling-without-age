import { fleet } from "@/features/fleet";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { rideRequests } from "@/features/ride-requests";
import { rides, type RideModelName } from "@/features/rides";
import { activity } from "@/lib/activity";
import { readinessForChapters } from "./pilot-readiness";

const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_DAYS = 7;
export const ATTENTION_SHOWN = 5;

export type OverviewRide = {
  id: string;
  chapterId: string;
  model: RideModelName;
  title: string | null;
  locationName: string | null;
  destinationName: string | null;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  pilots: number;
  requiredPilots: number;
};

export type AttentionGroup<T> = { items: T[]; total: number };

export type NeedsAttention = {
  unstaffed: AttentionGroup<OverviewRide>;
  requests: AttentionGroup<{
    id: string;
    chapterId: string;
    requester: string | null;
    requestedStartsAt: Date;
    createdAt: Date;
    timeZone: string;
  }>;
  applications: AttentionGroup<{
    id: string;
    userId: string;
    chapterId: string;
    name: string;
    chapterName: string;
    createdAt: Date;
  }>;
  awaitingFinish: AttentionGroup<{
    id: string;
    chapterId: string;
    model: RideModelName;
    title: string | null;
    locationName: string | null;
    destinationName: string | null;
    endsAt: Date;
  }>;
  damages: AttentionGroup<{
    id: string;
    trishawId: string;
    trishawName: string;
    description: string;
    grounding: boolean;
    reportedAt: Date;
  }>;
  notReady: AttentionGroup<{
    userId: string;
    chapterId: string;
    name: string | null;
    coursesDone: boolean;
  }>;
};

const group = <T>(items: T[]): AttentionGroup<T> => ({
  items: items.slice(0, ATTENTION_SHOWN),
  total: items.length,
});

const inScope = (chapterIds: string[]) => {
  const wanted = new Set(chapterIds);
  return <T extends { chapterId: string }>(rows: T[]) =>
    rows.filter((row) => wanted.has(row.chapterId));
};

async function ridesAhead(chapterIds: string[], now: Date) {
  const rows = await rides.listRidesInRange(
    chapterIds,
    now,
    new Date(now.getTime() + WEEK_DAYS * DAY_MS),
  );
  return inScope(chapterIds)(rows)
    .filter((ride) => ride.status !== "cancelled" && ride.startsAt > now)
    .map((ride): OverviewRide => ({
      id: ride.id,
      chapterId: ride.chapterId,
      model: ride.model,
      title: ride.title,
      locationName: ride.locationName,
      destinationName: ride.destinationName,
      startsAt: ride.startsAt,
      endsAt: ride.endsAt,
      timeZone: ride.chapter.timeZone,
      pilots: ride.assignments.filter(
        (a) => a.role === "pilot" && a.stillPiloting,
      ).length,
      requiredPilots: ride.requiredPilots,
    }));
}

export async function weekAhead(
  chapterIds: string[],
  now = new Date(),
): Promise<OverviewRide[]> {
  if (!chapterIds.length) return [];
  return ridesAhead(chapterIds, now);
}

async function pilotsNotReady(chapterIds: string[], locale?: string | null) {
  const pilots = inScope(chapterIds)(
    await membership.listPilotMembers(chapterIds),
  );
  const byChapter = new Map<string, string[]>();
  for (const { userId, chapterId } of pilots)
    byChapter.set(chapterId, [...(byChapter.get(chapterId) ?? []), userId]);
  const readiness = await readinessForChapters(
    [...byChapter].map(([chapterId, userIds]) => ({ chapterId, userIds })),
    locale,
  );
  const waiting = [...readiness]
    .filter(([chapterId]) => byChapter.has(chapterId))
    .flatMap(([, byUser]) => [...byUser.values()])
    .filter((pilot) => !pilot.ready)
    .toSorted((a, b) => Number(b.coursesDone) - Number(a.coursesDone));
  const names = new Map(
    (
      await profile.getProfiles(
        waiting.slice(0, ATTENTION_SHOWN).map((p) => p.userId),
      )
    ).map((person) => [person.id, person.name]),
  );
  return waiting.map((pilot) => ({
    userId: pilot.userId,
    chapterId: pilot.chapterId,
    name: names.get(pilot.userId) ?? null,
    coursesDone: pilot.coursesDone,
  }));
}

export async function needsAttention(
  chapterIds: string[],
  now = new Date(),
  locale?: string | null,
): Promise<NeedsAttention> {
  if (!chapterIds.length)
    return {
      unstaffed: group([]),
      requests: group([]),
      applications: group([]),
      awaitingFinish: group([]),
      damages: group([]),
      notReady: group([]),
    };
  const scoped = inScope(chapterIds);
  const wanted = new Set(chapterIds);

  const [ahead, pending, applications, finishing, damages, notReady] =
    await Promise.all([
      ridesAhead(chapterIds, now),
      rideRequests.listPending(chapterIds, now),
      membership.listApplications(chapterIds, "pending"),
      rides.listRidesAwaitingFinish(chapterIds, now),
      fleet.listOpenDamages(chapterIds),
      pilotsNotReady(chapterIds, locale),
    ]);

  const finishRows = scoped(finishing.rides);
  const damageRows = damages.damages.filter((d) =>
    d.chapterIds.some((id) => wanted.has(id)),
  );

  return {
    unstaffed: group(ahead.filter((ride) => ride.pilots < ride.requiredPilots)),
    requests: group(
      scoped(pending).map((request) => ({
        id: request.id,
        chapterId: request.chapterId,
        requester: request.requester?.name ?? null,
        requestedStartsAt: request.requestedStartsAt,
        createdAt: request.createdAt,
        timeZone: request.chapter.timeZone,
      })),
    ),
    applications: group(
      scoped(applications).map((application) => ({
        id: application.id,
        userId: application.userId,
        chapterId: application.chapterId,
        name: application.user.name,
        chapterName: application.chapter.name,
        createdAt: application.createdAt,
      })),
    ),
    awaitingFinish: {
      items: finishRows.slice(0, ATTENTION_SHOWN),
      total:
        finishRows.length === finishing.rides.length
          ? finishing.total
          : finishRows.length,
    },
    damages: {
      items: damageRows.slice(0, ATTENTION_SHOWN).map((damage) => ({
        id: damage.id,
        trishawId: damage.trishawId,
        trishawName: damage.trishawName,
        description: damage.description,
        grounding: damage.grounding,
        reportedAt: damage.reportedAt,
      })),
      total:
        damageRows.length === damages.damages.length
          ? damages.total
          : damageRows.length,
    },
    notReady: group(notReady),
  };
}

export async function recentActivity(chapterIds: string[], take = 12) {
  const events = await activity.listForChapters(chapterIds, take);
  const wanted = new Set(chapterIds);
  return events.filter(
    (event) => event.chapterId !== null && wanted.has(event.chapterId),
  );
}

export const attentionCount = (attention: NeedsAttention) =>
  Object.values(attention).reduce((sum, { total }) => sum + total, 0);
