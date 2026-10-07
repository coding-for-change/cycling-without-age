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
  membership: { listChapterAdmins: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  ...jest.requireActual("@/features/rides/schemas"),
  rides: { getRideFacts: jest.fn(), listRideParticipants: jest.fn() },
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
  (rides.getRideFacts as jest.Mock).mockResolvedValue({
    title: null,
    model: "functional",
    destinationName: "Dr. Weber",
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
      pair: null,
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
      pair: null,
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
        pair: null,
      }),
    ).toEqual(["pilot-1"]);
    expect(
      await ridePilotAssigned.recipients({
        ...base,
        actorUserId: "pilot-1",
        userId: "pilot-1",
        self: true,
        pair: null,
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
        pair: null,
      }),
    ).toEqual(["carer-1", "rider-1"]);
  });

  // Whether a country admin or a superadmin did it, an admin removal is no news.
  it("tells the admins when a rider's own account gives the seat up, and only then", async () => {
    const event = (self: boolean): EventOf<"ride.riderRemoved"> => ({
      type: "ride.riderRemoved",
      ...scope,
      actorUserId: self ? "carer-1" : "country-admin",
      passengerId: "passenger-1",
      self,
    });
    expect(await rideBookingCancelled.recipients(event(false))).toEqual([]);
    expect(await rideBookingCancelled.recipients(event(true))).toEqual([
      "admin-1",
      "pilot-1",
    ]);
  });

  describe("a round trip", () => {
    const lead = { role: "lead" as const, otherRideId: "ride-2" };
    const follow = { role: "follow" as const, otherRideId: "ride-1" };
    const cancelled = (
      pair: typeof lead | typeof follow,
    ): EventOf<"ride.cancelled"> => ({
      type: "ride.cancelled",
      ...scope,
      actorUserId: "admin-1",
      reasonCode: "weather",
      pair,
    });

    it("is one message, from the way there", async () => {
      expect(await rideCancelled.recipients(cancelled(follow))).toEqual([]);
      expect(
        await rideBookingConfirmed.recipients({
          type: "ride.riderBooked",
          ...scope,
          actorUserId: "admin-1",
          passengerId: "passenger-1",
          pair: follow,
        }),
      ).toEqual([]);
    });

    // A pilot booked only on the way back still hears it was cancelled.
    it("reaches everyone on either leg", async () => {
      (rides.listRideParticipants as jest.Mock).mockImplementation(
        async (rideId: string) => ({
          chapterId: CHAPTER,
          pilotUserIds: rideId === "ride-2" ? ["pilot-back"] : ["pilot-1"],
          riderAccountUserIds: ["carer-1"],
        }),
      );
      expect((await rideCancelled.recipients(cancelled(lead))).sort()).toEqual([
        "carer-1",
        "pilot-1",
        "pilot-back",
      ]);
    });
  });
});

describe("what a ride message says", () => {
  it("names the new destination, not the start, when only the destination moved", async () => {
    const event: EventOf<"ride.rescheduled"> = {
      type: "ride.rescheduled",
      ...scope,
      actorUserId: "admin-1",
      changes: ["destination"],
      pair: null,
    };
    const params = rideRescheduled.payload.parse(
      await rideRescheduled.params(event),
    );
    const { body } = rideRescheduled.message(
      params,
      getEmailStrings("en"),
      "en",
    );
    expect(body).toContain("Dr. Weber");
    expect(body).not.toContain("now starts");
  });

  // 09:00 UTC is 10:00 in Munich in late October; the reader is elsewhere.
  it("writes the time on the chapter's clock", async () => {
    const event: EventOf<"ride.cancelled"> = {
      type: "ride.cancelled",
      ...scope,
      actorUserId: "admin-1",
      reasonCode: "weather",
      pair: null,
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
        pair: null,
      }),
    ).toBe("/rides/ride-1");
  });
});
