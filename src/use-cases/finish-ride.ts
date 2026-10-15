import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { rides } from "@/features/rides";

const HOUR_MS = 60 * 60 * 1000;
const PICKUP_LEAD_HOURS = 24;

/** Each trishaw with the location it waits at, if the chapter can still reach it. */
export async function trishawPlaces(chapterId: string, trishawIds: string[]) {
  const [trishaws, locations] = await Promise.all([
    fleet.getTrishaws(trishawIds),
    fleet.listLocationsForChapters([chapterId]),
  ]);
  const locationById = new Map(locations.map((l) => [l.id, l]));
  return trishaws.map((trishaw) => ({
    trishaw,
    location: locationById.get(trishaw.storageLocation.id) ?? null,
  }));
}

/**
 * What a pilot sees after a ride: the chapter's standing instructions, then per
 * trishaw where it goes back and how to get in, the roster to close and the
 * pilot's own debrief. Only the ride's own pilots who are still members get
 * it, and only locations the chapter can still reach — the access code is on
 * this page.
 */
export async function finishRideView(rideId: string, userId: string) {
  const ride = await rides.getFinishableRideForPilot(rideId, userId);
  if (!ride) return null;

  const [settings, places, reported, crewView, debrief, currency] =
    await Promise.all([
      chapters.getSettings(ride.chapterId),
      trishawPlaces(
        ride.chapterId,
        ride.trishaws.map(({ trishaw }) => trishaw.id),
      ),
      fleet.listDamagesReportedOnRide(rideId, userId),
      rides.getRideForPilot(rideId, userId),
      rides.getDebrief(rideId, userId),
      rides.chapterCurrencyOfRide(rideId),
    ]);

  return {
    ride,
    roster: crewView?.roster ?? [],
    debrief,
    currency,
    instructions: settings.postRideInstructions,
    trishaws: places.map((place) => ({
      ...place,
      reported: reported.filter((d) => d.trishawId === place.trishaw.id),
    })),
  };
}

/**
 * The pickup pack opens a day before the ride, but never while the pilot may
 * still step back: in a chapter whose staffing window is shorter than a day,
 * an access code read and a seat given up would leave the code with someone
 * no longer on the ride.
 */
export const pickupOpens = (startsAt: Date, staffingLeadHours: number) =>
  new Date(
    startsAt.getTime() -
      Math.min(PICKUP_LEAD_HOURS, staffingLeadHours) * HOUR_MS,
  );

/**
 * The pickup pack on an assigned pilot's ride page: where each trishaw waits
 * and its access code, until the ride ends. The caller passes a ride it
 * already read as this pilot's own.
 */
export async function pickupView(
  ride: {
    chapterId: string;
    status: string;
    startsAt: Date;
    endsAt: Date;
    trishaws: { trishaw: { id: string } }[];
  },
  now = new Date(),
) {
  if (ride.status !== "scheduled" || now > ride.endsAt || !ride.trishaws.length)
    return null;
  const { staffingCheckLeadHours } = await chapters.getSettings(ride.chapterId);
  if (now < pickupOpens(ride.startsAt, staffingCheckLeadHours)) return null;
  return trishawPlaces(
    ride.chapterId,
    ride.trishaws.map(({ trishaw }) => trishaw.id),
  );
}
