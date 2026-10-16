import "server-only";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { fullName } from "@/lib/utils";
import type { PassengerRidePage, PassengerRideRow } from "../facade";

export type PassengerListRide = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  model: PassengerRideRow["model"];
  status: PassengerRideRow["status"];
  title: string | null;
  locationName: string | null;
  destinationName: string | null;
  pilots: { id: string; name: string; avatar: string }[];
  riders: string[];
};

export type PassengerListPage = {
  rides: PassengerListRide[];
  nextCursor: string | null;
};

export const toPassengerListRide = (
  ride: PassengerRideRow,
): PassengerListRide => ({
  id: ride.id,
  startsAt: ride.startsAt,
  endsAt: ride.endsAt,
  timeZone: ride.chapter.timeZone,
  model: ride.model,
  status: ride.status,
  title: ride.title,
  locationName: ride.locationName,
  destinationName: ride.destinationName,
  pilots: ride.assignments
    .filter(({ role }) => role === "pilot")
    .map(({ user }) => ({
      id: user.id,
      name: user.name,
      avatar: avatarSvg(avatarSeed(user.email)),
    })),
  riders: ride.roster.map(({ passenger }) => fullName(passenger)),
});

export const toPassengerListPage = (
  page: PassengerRidePage,
): PassengerListPage => ({
  rides: page.rides.map(toPassengerListRide),
  nextCursor: page.nextCursor,
});
