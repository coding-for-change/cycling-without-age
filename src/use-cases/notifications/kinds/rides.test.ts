import { getEmailStrings } from "@/emails/strings";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import type { EventOf } from "@/lib/events/catalog";
import {
  rideBookingCancelled,
  rideBookingConfirmed,
  rideCancelled,
  ridePilotAssigned,
  rideRescheduled,
} from "./rides";

jest.mock("@/features/membership", () => ({
  membership: { listChapterAdmins: jest.fn(), getMemberRoles: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  ...jest.requireActual("@/features/rides/schemas"),
  rides: { getRide: jest.fn(), listRideParticipants: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: { getPassenger: jest.fn() },
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfile: jest.fn().mockResolvedValue({ name: "Anke" }) },
}));

const CHAPTER = "chapter-muenchen";
const scope = { rideId: "ride-1", chapterId: CHAPTER };

beforeEach(() => {
  jest.clearAllMocks();
  (rides.listRideParticipants as jest.Mock).mockResolvedValue({
    chapterId: CHAPTER,
    pilotUserIds: ["pilot-1", "pilot-2"],
    riderAccountUserIds: ["carer-1", "rider-1"],
  });
  (membership.listChapterAdmins as jest.Mock).mockResolvedValue([
    { userId: "admin-1" },
    { userId: "pilot-1" },
  ]);
  (passengers.getPassenger as jest.Mock).mockResolvedValue({
    id: "passenger-1",
    firstName: "Erna",
    lastName: "Huber",
    managedByUserId: "carer-1",
    userId: "rider-1",
  });
  (rides.getRide as jest.Mock).mockResolvedValue({
    title: null,
    model: "pleasure",
    startsAt: new Date("2026-10-27T09:00:00Z"),
    endsAt: new Date("2026-10-27T10:30:00Z"),
    locationName: "Sonnenhof",
    chapter: { name: "München", timeZone: "Europe/Berlin" },
  });
});

describe("who hears about a ride", () => {
  // Report 14: everyone the ride concerned, once, except whoever cancelled it.
  it("tells pilots, riders' accounts and admins of a cancellation, minus the actor", async () => {
    const event: EventOf<"ride.cancelled"> = {
      type: "ride.cancelled",
      ...scope,
      actorUserId: "admin-1",
      reasonCode: "weather",
    };
    expect((await rideCancelled.recipients(event)).sort()).toEqual([
      "carer-1",
      "pilot-1",
      "pilot-2",
      "rider-1",
    ]);
  });

  it("tells only the people on the ride about a new time", async () => {
    const event: EventOf<"ride.rescheduled"> = {
      type: "ride.rescheduled",
      ...scope,
      actorUserId: "admin-1",
      changes: ["time"],
    };
    expect(await rideRescheduled.recipients(event)).not.toContain("admin-1");
  });

  it("tells the pilot an admin assigned, and nobody when they signed up themself", async () => {
    const base = { type: "ride.pilotAssigned" as const, ...scope };
    expect(
      await ridePilotAssigned.recipients({
        ...base,
        actorUserId: "admin-1",
        userId: "pilot-1",
        self: false,
      }),
    ).toEqual(["pilot-1"]);
    expect(
      await ridePilotAssigned.recipients({
        ...base,
        actorUserId: "pilot-1",
        userId: "pilot-1",
        self: true,
      }),
    ).toEqual([]);
  });

  it("tells both the rider and whoever manages them about a booking", async () => {
    expect(
      await rideBookingConfirmed.recipients({
        type: "ride.riderBooked",
        ...scope,
        actorUserId: "admin-1",
        passengerId: "passenger-1",
      }),
    ).toEqual(["carer-1", "rider-1"]);
  });

  it("tells the admins when a rider leaves on their own, not when an admin removed them", async () => {
    const event = (actorUserId: string): EventOf<"ride.riderRemoved"> => ({
      type: "ride.riderRemoved",
      ...scope,
      actorUserId,
      passengerId: "passenger-1",
    });
    const roles = membership.getMemberRoles as jest.Mock;
    roles.mockResolvedValueOnce(["admin"]);
    expect(await rideBookingCancelled.recipients(event("admin-1"))).toEqual([]);
    roles.mockResolvedValueOnce(["passenger"]);
    expect(await rideBookingCancelled.recipients(event("carer-1"))).toEqual([
      "admin-1",
      "pilot-1",
    ]);
  });
});

describe("what a ride message says", () => {
  // 09:00 UTC is 10:00 in Munich in late October; the reader is elsewhere.
  it("writes the time on the chapter's clock", async () => {
    const event: EventOf<"ride.cancelled"> = {
      type: "ride.cancelled",
      ...scope,
      actorUserId: "admin-1",
      reasonCode: "weather",
    };
    const params = rideCancelled.payload.parse(
      await rideCancelled.params(event),
    );
    const message = rideCancelled.message(params, getEmailStrings("en"), "en");
    expect(message.body).toContain("10:00");
    expect(message.body).toContain("Sonnenhof");
    expect(message.body).toContain("the weather");
  });

  it("links a cancellation to the reader's own page through /rides", () => {
    expect(
      rideCancelled.href({
        type: "ride.cancelled",
        ...scope,
        actorUserId: null,
        reasonCode: "other",
      }),
    ).toBe("/rides/ride-1");
  });
});
