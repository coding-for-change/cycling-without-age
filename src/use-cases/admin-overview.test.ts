import { fleet } from "@/features/fleet";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { rideRequests } from "@/features/ride-requests";
import { rides } from "@/features/rides";
import { activity } from "@/lib/activity";
import {
  attentionCount,
  needsAttention,
  recentActivity,
  weekAhead,
} from "./admin-overview";
import { readinessForChapters } from "./pilot-readiness";

jest.mock("@/features/rides", () => ({
  rides: { listRidesInRange: jest.fn(), listRidesAwaitingFinish: jest.fn() },
}));
jest.mock("@/features/ride-requests", () => ({
  rideRequests: { listPending: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { listApplications: jest.fn(), listPilotMembers: jest.fn() },
}));
jest.mock("@/features/fleet", () => ({
  fleet: { listOpenDamages: jest.fn() },
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfiles: jest.fn() },
}));
jest.mock("@/lib/activity", () => ({
  activity: { listForChapters: jest.fn() },
}));
jest.mock("./pilot-readiness", () => ({ readinessForChapters: jest.fn() }));

const NOW = new Date("2026-10-22T08:00:00Z");
const IN = "chapter-in";
const OUT = "chapter-out";
const at = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000);

const ride = (id: string, chapterId: string, pilots: number) => ({
  id,
  chapterId,
  model: "event",
  status: "scheduled",
  title: id,
  locationName: null,
  destinationName: null,
  startsAt: at(24),
  endsAt: at(26),
  requiredPilots: 2,
  chapter: { timeZone: "Europe/Berlin" },
  assignments: Array.from({ length: pilots }, (_, i) => ({
    role: "pilot",
    stillPiloting: true,
    user: { id: `p${i}` },
  })),
});

const readiness = (userId: string, chapterId: string, ready: boolean) => ({
  userId,
  chapterId,
  ready,
  coursesDone: ready,
  courses: [],
  inPerson: { confirmedAt: null, confirmedBy: null },
});

beforeEach(() => {
  jest
    .mocked(rides.listRidesInRange)
    .mockResolvedValue([
      ride("staffed", IN, 2),
      ride("short", IN, 1),
      ride("foreign", OUT, 0),
    ] as never);
  jest.mocked(rides.listRidesAwaitingFinish).mockResolvedValue({
    rides: [
      { id: "done-in", chapterId: IN, endsAt: at(-5) },
      { id: "done-out", chapterId: OUT, endsAt: at(-5) },
    ],
    total: 2,
  } as never);
  jest.mocked(rideRequests.listPending).mockResolvedValue([
    {
      id: "req-in",
      chapterId: IN,
      requester: { name: "Ada" },
      requestedStartsAt: at(48),
      createdAt: at(-2),
      chapter: { timeZone: "Europe/Berlin" },
    },
    {
      id: "req-out",
      chapterId: OUT,
      requester: { name: "Eve" },
      requestedStartsAt: at(48),
      createdAt: at(-2),
      chapter: { timeZone: "Europe/Berlin" },
    },
  ] as never);
  jest.mocked(membership.listApplications).mockResolvedValue([
    {
      id: "app-out",
      userId: "u-out",
      chapterId: OUT,
      user: { name: "Mallory" },
      chapter: { name: "Out" },
      createdAt: at(-1),
    },
  ] as never);
  jest.mocked(membership.listPilotMembers).mockResolvedValue([
    { userId: "pilot-in", chapterId: IN },
    { userId: "pilot-out", chapterId: OUT },
  ]);
  jest.mocked(readinessForChapters).mockResolvedValue(
    new Map([
      [IN, new Map([["pilot-in", readiness("pilot-in", IN, false)]])],
      [OUT, new Map([["pilot-out", readiness("pilot-out", OUT, false)]])],
    ]),
  );
  jest
    .mocked(profile.getProfiles)
    .mockResolvedValue([{ id: "pilot-in", name: "Pia" }] as never);
  jest.mocked(fleet.listOpenDamages).mockResolvedValue({
    damages: [
      {
        id: "dmg-in",
        trishawId: "t1",
        trishawName: "Freja",
        description: "Flat",
        grounding: true,
        reportedAt: at(-30),
        chapterIds: [IN],
      },
      {
        id: "dmg-out",
        trishawId: "t2",
        trishawName: "Olga",
        description: "Bell",
        grounding: false,
        reportedAt: at(-30),
        chapterIds: [],
      },
    ],
    total: 2,
  } as never);
  jest.mocked(activity.listForChapters).mockResolvedValue([
    { id: "e1", chapterId: IN },
    { id: "e2", chapterId: OUT },
    { id: "e3", chapterId: null },
  ] as never);
});

afterEach(() => jest.clearAllMocks());

describe("needsAttention", () => {
  it("asks every facade for the chapters in scope only", async () => {
    await needsAttention([IN], NOW);

    expect(rides.listRidesInRange).toHaveBeenCalledWith(
      [IN],
      NOW,
      expect.any(Date),
    );
    expect(rideRequests.listPending).toHaveBeenCalledWith([IN], NOW);
    expect(membership.listApplications).toHaveBeenCalledWith([IN], "pending");
    expect(rides.listRidesAwaitingFinish).toHaveBeenCalledWith([IN], NOW);
    expect(fleet.listOpenDamages).toHaveBeenCalledWith([IN]);
    expect(membership.listPilotMembers).toHaveBeenCalledWith([IN]);
    expect(readinessForChapters).toHaveBeenCalledWith(
      [{ chapterId: IN, userIds: ["pilot-in"] }],
      undefined,
    );
  });

  it("drops anything a facade returns from outside the scope", async () => {
    const result = await needsAttention([IN], NOW);

    expect(result.unstaffed.items.map((r) => r.id)).toEqual(["short"]);
    expect(result.requests.items.map((r) => r.id)).toEqual(["req-in"]);
    expect(result.applications.items).toEqual([]);
    expect(result.awaitingFinish.items.map((r) => r.id)).toEqual(["done-in"]);
    expect(result.awaitingFinish.total).toBe(1);
    expect(result.damages.items.map((d) => d.id)).toEqual(["dmg-in"]);
    expect(result.damages.total).toBe(1);
    expect(result.notReady.items).toEqual([
      { userId: "pilot-in", chapterId: IN, name: "Pia", coursesDone: false },
    ]);
    expect(attentionCount(result)).toBe(5);
  });

  it("reads nothing when the scope holds no chapter", async () => {
    const result = await needsAttention([], NOW);

    expect(attentionCount(result)).toBe(0);
    expect(rides.listRidesInRange).not.toHaveBeenCalled();
    expect(rideRequests.listPending).not.toHaveBeenCalled();
    expect(membership.listApplications).not.toHaveBeenCalled();
    expect(fleet.listOpenDamages).not.toHaveBeenCalled();
  });
});

describe("weekAhead", () => {
  it("shows the rides of the scope with their staffing", async () => {
    const week = await weekAhead([IN], NOW);

    expect(week.map((r) => [r.id, r.pilots, r.requiredPilots])).toEqual([
      ["staffed", 2, 2],
      ["short", 1, 2],
    ]);
  });
});

describe("recentActivity", () => {
  it("keeps only events of chapters in scope", async () => {
    const events = await recentActivity([IN], 10);

    expect(activity.listForChapters).toHaveBeenCalledWith([IN], 10);
    expect(events.map((e) => e.id)).toEqual(["e1"]);
  });
});
