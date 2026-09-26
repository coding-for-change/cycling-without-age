import { fleet, type DamageReportInput } from "@/features/fleet";
import { rides } from "@/features/rides";
import { DomainError } from "@/lib/domain-error";

type RideOfReport = {
  id: string;
  chapterId: string;
  assignments: { user: { id: string } }[];
  trishaws: { trishaw: { id: string } }[];
};

async function reportDamage({
  input,
  userId,
  rideId,
  chapterId,
}: {
  input: DamageReportInput;
  userId: string;
  rideId: string | null;
  chapterId: string | null;
}) {
  return fleet.reportDamage({
    ...input,
    rideId,
    reportedByUserId: userId,
    chapterId,
    affectedRideIds: input.grounding
      ? await rides.upcomingRideIdsWithTrishaw(input.trishawId)
      : [],
  });
}

/** A pilot may report only on a trishaw that rode with them: the ride must be theirs and the trishaw on it. */
export async function reportDamageAsPilot({
  input,
  userId,
  ride,
}: {
  input: DamageReportInput;
  userId: string;
  ride: RideOfReport;
}) {
  if (!ride.assignments.some((a) => a.user.id === userId))
    throw new DomainError("notAssigned");
  if (!ride.trishaws.some(({ trishaw }) => trishaw.id === input.trishawId))
    throw new DomainError("trishawNotOnRide");

  return reportDamage({
    input,
    userId,
    rideId: ride.id,
    chapterId: ride.chapterId,
  });
}

export const reportDamageAsAdmin = ({
  input,
  userId,
}: {
  input: DamageReportInput;
  userId: string;
}) => reportDamage({ input, userId, rideId: null, chapterId: null });
