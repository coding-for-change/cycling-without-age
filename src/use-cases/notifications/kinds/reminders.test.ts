import { fleet } from "@/features/fleet";
import { membership } from "@/features/membership";
import { rides } from "@/features/rides";
import type { EventOf } from "@/lib/events/catalog";
import { rideBookingCancelled } from "./rides";
import {
  rideNoDemand,
  ridePilotReminder,
  rideRiderReminder,
  rideRosterRefilled,
} from "./reminders";

jest.mock("@/features/membership", () => ({
  membership: { listChapterAdmins: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  ...jest.requireActual("@/features/rides/schemas"),
  rides: {
    getRideFacts: jest.fn(),
    getRideScope: jest.fn(),
    listRideParticipants: jest.fn(),
  },
}));
jest.mock("@/features/fleet", () => ({
  fleet: { listTrishawPlaces: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({ passengers: {} }));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));

const CHAPTER = "chapter-muenchen";
const lead = { role: "lead" as const, otherRideId: "ride-2" };
const follow = { role: "follow" as const, otherRideId: "ride-1" };
const due = <K extends "ride.riderReminderDue" | "ride.volunteerReminderDue">(
  type: K,
  pair: typeof lead | typeof follow | null = null,
) =>
  ({
    type,
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: null,
    pair,
  }) as EventOf<K>;

const participants = (rideId: string) =>
  rideId === "ride-1"
    ? {
        chapterId: CHAPTER,
        pilotUserIds: ["pilot-1"],
        riderCount: 1,
        riderAccountUserIds: ["carer-1"],
      }
    : {
        chapterId: CHAPTER,
        pilotUserIds: ["pilot-1", "pilot-2"],
        riderCount: 1,
        riderAccountUserIds: ["carer-1", "rider-2"],
      };

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({
    now: new Date("2026-10-20T08:00:00Z"),
    doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
  });
  (rides.getRideFacts as jest.Mock).mockResolvedValue({
    title: null,
    model: "event",
    startsAt: new Date("2026-10-21T08:00:00Z"),
    endsAt: new Date("2026-10-21T10:00:00Z"),
    locationName: "Sonnenhof",
    destinationName: null,
    chapter: { name: "München", timeZone: "Europe/Berlin" },
  });
  (rides.listRideParticipants as jest.Mock).mockImplementation(
    async (rideId: string) => participants(rideId),
  );
  (membership.listChapterAdmins as jest.Mock).mockResolvedValue([
    { userId: "admin-1" },
  ]);
});
afterEach(() => jest.useRealTimers());

describe("the rider reminder", () => {
  it("reaches the riders' accounts and never the pilots", async () => {
    expect(
      await rideRiderReminder.recipients(due("ride.riderReminderDue")),
    ).toEqual(["carer-1"]);
  });

  it("reaches everyone booked on either leg, once", async () => {
    expect(
      await rideRiderReminder.recipients(due("ride.riderReminderDue", lead)),
    ).toEqual(["carer-1", "rider-2"]);
  });

  it("says nothing for the way back, nor about a ride already over", async () => {
    expect(
      await rideRiderReminder.recipients(due("ride.riderReminderDue", follow)),
    ).toEqual([]);
    (rides.getRideFacts as jest.Mock).mockResolvedValue({
      endsAt: new Date("2026-10-19T10:00:00Z"),
    });
    expect(
      await rideRiderReminder.recipients(due("ride.riderReminderDue")),
    ).toEqual([]);
  });

  it("still reminds this leg when the other leg can't be read", async () => {
    (rides.listRideParticipants as jest.Mock).mockImplementation(
      async (rideId: string) => {
        if (rideId === "ride-2") throw new Error("gone");
        return participants(rideId);
      },
    );
    expect(
      await rideRiderReminder.recipients(due("ride.riderReminderDue", lead)),
    ).toEqual(["carer-1"]);
  });
});

describe("the pilots' reminder", () => {
  it("reaches the pilots and never the riders' accounts", async () => {
    expect(
      await ridePilotReminder.recipients(due("ride.volunteerReminderDue")),
    ).toEqual(["pilot-1"]);
    expect(
      await ridePilotReminder.recipients(
        due("ride.volunteerReminderDue", lead),
      ),
    ).toEqual(["pilot-1", "pilot-2"]);
  });

  // The access code stays behind the sign-in, on the ride page.
  it("carries where each trishaw waits, never how to get in", async () => {
    (rides.getRideScope as jest.Mock).mockResolvedValue({
      id: "ride-1",
      chapterId: CHAPTER,
      trishawIds: Array.from({ length: 8 }, (_, i) => `trishaw-${i}`),
    });
    (fleet.listTrishawPlaces as jest.Mock).mockImplementation(
      async (_chapterId: string, ids: string[]) =>
        ids.map((id) => ({
          trishaw: { id, name: `${id} ${"x".repeat(80)}` },
          location: {
            name: "Depot",
            address: "y".repeat(100),
            accessCode: "4711",
          },
        })),
    );
    const params = await ridePilotReminder.params(
      due("ride.volunteerReminderDue"),
    );
    expect(fleet.listTrishawPlaces).toHaveBeenCalledWith(
      CHAPTER,
      expect.arrayContaining(["trishaw-0"]),
    );
    expect(
      (fleet.listTrishawPlaces as jest.Mock).mock.calls[0][1],
    ).toHaveLength(6);
    const lines = JSON.parse(params.pickup!) as [string, string][];
    expect(lines).toHaveLength(6);
    expect(
      lines.every(([name, place]) => name.length <= 60 && place.length <= 80),
    ).toBe(true);
    expect(JSON.stringify(params)).not.toContain("4711");
  });
});

describe("the empty-ride flag", () => {
  it("reaches the chapter's admins, once for a round trip", async () => {
    const event = (pair: typeof lead | typeof follow | null) =>
      ({
        type: "ride.noDemand",
        rideId: "ride-1",
        chapterId: CHAPTER,
        actorUserId: null,
        pair,
      }) as EventOf<"ride.noDemand">;
    expect(await rideNoDemand.recipients(event(null))).toEqual(["admin-1"]);
    expect(await rideNoDemand.recipients(event(follow))).toEqual([]);
  });
});

describe("a seat given up on a round trip", () => {
  it("is told once, from the way there", async () => {
    expect(
      await rideBookingCancelled.recipients({
        type: "ride.riderRemoved",
        rideId: "ride-2",
        chapterId: CHAPTER,
        actorUserId: "carer-1",
        passengerId: "passenger-1",
        self: true,
        rosterNowEmpty: true,
        pair: follow,
      }),
    ).toEqual([]);
  });
});

describe("a seat taken back on an emptied ride", () => {
  it("tells the other admins the ride has a rider again", async () => {
    expect(
      await rideRosterRefilled.recipients({
        type: "ride.rosterRefilled",
        rideId: "ride-1",
        chapterId: CHAPTER,
        actorUserId: "carer-1",
        passengerId: "passenger-1",
      }),
    ).toEqual(["admin-1"]);
  });
});
