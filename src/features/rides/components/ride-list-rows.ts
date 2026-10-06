import "server-only";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import type { RideCalendarRow } from "../facade";
import { ridePilots, rideTrishaws } from "./ride-presentation";

export type ListRide = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  model: RideCalendarRow["model"];
  status: RideCalendarRow["status"];
  title: string | null;
  locationName: string | null;
  destinationName: string | null;
  riders: number;
  capacity: number | null;
  requiredPilots: number;
  pilots: { id: string; name: string; avatar: string }[];
  trishaws: string[];
  grounded: boolean;
};

export type ListRidePage = {
  past: ListRide[];
  rides: ListRide[];
  nextCursor: string | null;
};

export function toListRide(ride: RideCalendarRow): ListRide {
  return {
    id: ride.id,
    startsAt: ride.startsAt,
    endsAt: ride.endsAt,
    model: ride.model,
    status: ride.status,
    title: ride.title,
    locationName: ride.locationName,
    destinationName: ride.destinationName,
    riders: ride._count.roster,
    capacity: ride.capacity,
    requiredPilots: ride.requiredPilots,
    pilots: ridePilots(ride).map(({ user }) => ({
      id: user.id,
      name: user.name,
      avatar: avatarSvg(avatarSeed(user.email)),
    })),
    trishaws: rideTrishaws(ride).map((trishaw) => trishaw.name),
    grounded:
      ride.status === "scheduled" &&
      rideTrishaws(ride).some((trishaw) => trishaw.status !== "active"),
  };
}

export const toListPage = (page: {
  past: RideCalendarRow[];
  rides: RideCalendarRow[];
  nextCursor: string | null;
}): ListRidePage => ({
  past: page.past.map(toListRide),
  rides: page.rides.map(toListRide),
  nextCursor: page.nextCursor,
});
