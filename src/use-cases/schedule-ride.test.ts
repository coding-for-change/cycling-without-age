import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { personProfiles } from "@/features/person-profiles";
import { training, type FamilyStatusName } from "@/features/training";
import {
  rides,
  scheduleRideForm,
  type ScheduleRideForm,
} from "@/features/rides";
import { domainCode } from "@/lib/domain-error";
import {
  allocateTrishaws,
  freeTrishawsInWindow,
  scheduleRideAt,
} from "@/use-cases/schedule-ride";

jest.mock("@/features/chapters", () => ({
  chapters: {
    getChapter: jest.fn(),
    getChapterCountryId: jest.fn(async () => "country-de"),
  },
}));
jest.mock("@/features/training", () => ({
  ...jest.requireActual("@/features/training/requirements"),
  training: { readinessFacts: jest.fn() },
}));
jest.mock("@/features/person-profiles", () => ({
  personProfiles: { inPersonTrainingOf: jest.fn() },
}));
jest.mock("@/use-cases/training-access", () => ({
  trainingContext: jest.fn(),
}));
jest.mock("@/features/fleet", () => ({
  fleet: {
    assertUsable: jest.fn(),
    listTrishaws: jest.fn(),
  },
}));
jest.mock("@/features/passengers", () => ({
  passengers: { getPassengers: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { getMembersRoles: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  ...jest.requireActual("@/features/rides/schemas"),
  rides: {
    setRideTrishaws: jest.fn(),
    scheduleRide: jest.fn(),
    bookedTrishawIds: jest.fn(),
  },
}));

const assertUsable = fleet.assertUsable as jest.Mock;
const scheduleRide = rides.scheduleRide as jest.Mock;

const CHAPTER = "chapter-muenchen";
const ADMIN = "user-admin";
const RIDE = {
  id: "ride-1",
  chapterId: CHAPTER,
  trishawIds: ["grounded-since"],
};

const trained = (
  pilots: Record<string, { course: FamilyStatusName; inPerson: boolean }>,
) => {
  (training.readinessFacts as jest.Mock).mockResolvedValue({
    families: new Map(),
    requirements: new Map([[CHAPTER, [{ familyId: "basics" }]]]),
    statuses: new Map([
      [
        CHAPTER,
        new Map(
          Object.entries(pilots).map(([userId, { course }]) => [
            userId,
            [{ familyId: "basics", title: "Basics", status: course }],
          ]),
        ),
      ],
    ]),
    exemptions: new Map(),
  });
  (personProfiles.inPersonTrainingOf as jest.Mock).mockResolvedValue(
    new Map(
      Object.entries(pilots)
        .filter(([, pilot]) => pilot.inPerson)
        .map(([userId]) => [
          userId,
          {
            confirmedAt: new Date(),
            confirmedByUserId: ADMIN,
          },
        ]),
    ),
  );
};

const scheduleAt = (form: ScheduleRideForm) =>
  scheduleRideAt(scheduleRideForm.parse(form), ADMIN);

beforeEach(() => {
  jest.clearAllMocks();
  assertUsable.mockResolvedValue(undefined);
  (chapters.getChapter as jest.Mock).mockResolvedValue({
    id: CHAPTER,
    timeZone: "Europe/Berlin",
  });
  scheduleRide.mockResolvedValue({ id: "ride-new" });
  (passengers.getPassengers as jest.Mock).mockResolvedValue([]);
  (membership.getMembersRoles as jest.Mock).mockResolvedValue(new Map());
});

describe("allocateTrishaws", () => {
  it("checks only newly added trishaws, so a grounded one already on the ride can stay", async () => {
    await allocateTrishaws(RIDE, ["grounded-since", "new-one"], ADMIN);
    expect(assertUsable).toHaveBeenCalledWith(["new-one"], CHAPTER);
    expect(rides.setRideTrishaws).toHaveBeenCalledWith(
      "ride-1",
      ["grounded-since", "new-one"],
      ADMIN,
    );
  });

  it("stops before writing when a new trishaw is unusable", async () => {
    assertUsable.mockRejectedValue(new Error("trishawUnavailable"));
    await expect(allocateTrishaws(RIDE, ["new-one"], ADMIN)).rejects.toThrow();
    expect(rides.setRideTrishaws).not.toHaveBeenCalled();
  });
});

describe("scheduleRideAt", () => {
  const form = {
    chapterId: CHAPTER,
    model: "functional" as const,
    slot: { date: "2026-10-27", start: "09:30", durationMinutes: 90 },
    locationName: "Sonnenhof",
    destinationName: "Dr. Weber",
    trishawIds: ["trishaw-1"],
  };

  // Late October is the first week of CET again; 09:30 Berlin is 08:30 UTC.
  it("reads the slot on the chapter's wall clock, not the server's", async () => {
    await scheduleAt(form);
    expect(scheduleRide).toHaveBeenCalledWith(
      expect.objectContaining({
        startsAt: new Date("2026-10-27T08:30:00Z"),
        endsAt: new Date("2026-10-27T10:00:00Z"),
        returnLeg: undefined,
      }),
      ADMIN,
    );
  });

  it("books the way back after the stay, as long as the way there", async () => {
    await scheduleAt({ ...form, roundTrip: true, stayMinutes: 45 });
    expect(scheduleRide.mock.calls[0][0].returnLeg).toEqual({
      startsAt: new Date("2026-10-27T10:45:00Z"),
      endsAt: new Date("2026-10-27T12:15:00Z"),
    });
  });

  it("gives an event or pleasure ride no way back", async () => {
    await scheduleAt({ ...form, model: "pleasure", roundTrip: true });
    expect(scheduleRide.mock.calls[0][0].returnLeg).toBeUndefined();
  });

  it("asks the fleet whether the chapter may use the trishaws first", async () => {
    assertUsable.mockRejectedValue(new Error("trishawNotInChapter"));
    await expect(scheduleAt(form)).rejects.toThrow();
    expect(assertUsable).toHaveBeenCalledWith(["trishaw-1"], CHAPTER);
    expect(scheduleRide).not.toHaveBeenCalled();
  });

  it("refuses a chapter that does not exist", async () => {
    (chapters.getChapter as jest.Mock).mockResolvedValue(null);
    await expect(scheduleAt(form)).rejects.toThrow("unknownChapter");
  });
});

describe("freeTrishawsInWindow", () => {
  const slot = { date: "2026-10-27", start: "09:30", durationMinutes: 60 };

  beforeEach(() => {
    (fleet.listTrishaws as jest.Mock).mockResolvedValue([
      { id: "free" },
      { id: "busy-there" },
      { id: "busy-back" },
    ]);
    (rides.bookedTrishawIds as jest.Mock).mockImplementation(
      async (_ids: string[], windows: unknown[]) =>
        new Set(
          windows.length > 1 ? ["busy-there", "busy-back"] : ["busy-there"],
        ),
    );
  });

  it("marks what another ride holds in the window", async () => {
    const { busy } = await freeTrishawsInWindow({ chapterId: CHAPTER, slot });
    expect(rides.bookedTrishawIds).toHaveBeenCalledWith(
      ["free", "busy-there", "busy-back"],
      [
        {
          startsAt: new Date("2026-10-27T08:30:00Z"),
          endsAt: new Date("2026-10-27T09:30:00Z"),
        },
      ],
      [],
    );
    expect(busy).toEqual({
      free: false,
      "busy-there": true,
      "busy-back": false,
    });
  });

  it("also checks the way back of a round trip", async () => {
    const { busy } = await freeTrishawsInWindow({
      chapterId: CHAPTER,
      slot,
      roundTrip: true,
      stayMinutes: 30,
    });
    expect(busy["busy-back"]).toBe(true);
  });
});

describe("people at scheduling", () => {
  const form = {
    chapterId: CHAPTER,
    model: "pleasure" as const,
    slot: { date: "2026-10-27", start: "09:30", durationMinutes: 90 },
    passengerIds: ["p-1"],
    pilotIds: ["pilot-1"],
  };
  const getPassengers = passengers.getPassengers as jest.Mock;
  const getMembersRoles = membership.getMembersRoles as jest.Mock;
  const codeOf = (run: Promise<unknown>) =>
    run.then(
      () => null,
      (error) => domainCode(error),
    );

  beforeEach(() => {
    getPassengers.mockResolvedValue([{ id: "p-1", chapterId: CHAPTER }]);
    getMembersRoles.mockResolvedValue(new Map([["pilot-1", ["pilot"]]]));
    trained({ "pilot-1": { course: "passed", inPerson: true } });
  });

  it("refuses a pilot who hasn't finished a required course", async () => {
    trained({ "pilot-1": { course: "notStarted", inPerson: true } });
    expect(await codeOf(scheduleAt(form))).toBe("pilotNotReady");
    expect(scheduleRide).not.toHaveBeenCalled();
  });

  it("schedules an exempt pilot", async () => {
    trained({ "pilot-1": { course: "exempt", inPerson: true } });
    expect(await codeOf(scheduleAt(form))).toBeNull();
    expect(scheduleRide).toHaveBeenCalled();
  });

  it("refuses a pilot whose in-person training isn't confirmed", async () => {
    trained({ "pilot-1": { course: "passed", inPerson: false } });
    expect(await codeOf(scheduleAt(form))).toBe("pilotNotReady");
    expect(scheduleRide).not.toHaveBeenCalled();
  });

  it("schedules a not-ready pilot when training isn't required", async () => {
    process.env.TRAINING_REQUIRED = "false";
    try {
      trained({ "pilot-1": { course: "notStarted", inPerson: false } });
      expect(await codeOf(scheduleAt(form))).toBeNull();
      expect(scheduleRide).toHaveBeenCalled();
      expect(training.readinessFacts).not.toHaveBeenCalled();
    } finally {
      process.env.TRAINING_REQUIRED = "true";
    }
  });

  it("checks readiness only after the role check", async () => {
    getMembersRoles.mockResolvedValue(new Map([["pilot-1", ["passenger"]]]));
    expect(await codeOf(scheduleAt(form))).toBe("notPilot");
    expect(training.readinessFacts).not.toHaveBeenCalled();
  });

  it("passes riders and pilots of the ride's chapter on", async () => {
    await scheduleAt(form);
    expect(getPassengers).toHaveBeenCalledWith(["p-1"]);
    expect(getMembersRoles).toHaveBeenCalledWith(["pilot-1"], CHAPTER);
    expect(scheduleRide.mock.calls[0][0]).toEqual(
      expect.objectContaining({ passengerIds: ["p-1"], pilotIds: ["pilot-1"] }),
    );
  });

  it("refuses a rider of another chapter", async () => {
    getPassengers.mockResolvedValue([{ id: "p-1", chapterId: "elsewhere" }]);
    expect(await codeOf(scheduleAt(form))).toBe("riderNotInChapter");
    expect(scheduleRide).not.toHaveBeenCalled();
  });

  it("refuses a rider who does not exist", async () => {
    getPassengers.mockResolvedValue([]);
    expect(await codeOf(scheduleAt(form))).toBe("unknownPassenger");
  });

  it("refuses someone who is not a member of the chapter", async () => {
    getMembersRoles.mockResolvedValue(new Map());
    expect(await codeOf(scheduleAt(form))).toBe("notPilot");
  });

  it("refuses someone who is not a pilot of the chapter", async () => {
    getMembersRoles.mockResolvedValue(new Map([["pilot-1", ["passenger"]]]));
    expect(await codeOf(scheduleAt(form))).toBe("notPilot");
    expect(scheduleRide).not.toHaveBeenCalled();
  });
});
