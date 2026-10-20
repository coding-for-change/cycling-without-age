import { membership } from "@/features/membership";
import { personProfiles } from "@/features/person-profiles";
import { rides } from "@/features/rides";
import { training, type FamilyStatusName } from "@/features/training";
import { staffRide } from "@/use-cases/staff-ride";

jest.mock("@/features/membership", () => ({
  membership: { getMemberRoles: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { assignVolunteer: jest.fn() },
}));
jest.mock("@/features/chapters", () => ({
  chapters: { getChapterCountryId: jest.fn(async () => "country-de") },
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

const getMemberRoles = membership.getMemberRoles as jest.Mock;

const RIDE = {
  id: "ride-1",
  chapterId: "chapter-muenchen",
  trishawIds: [],
};

const trained = (course: FamilyStatusName, inPerson: boolean) => {
  (training.readinessFacts as jest.Mock).mockResolvedValue({
    families: new Map(),
    requirements: new Map([[RIDE.chapterId, [{ familyId: "basics" }]]]),
    statuses: new Map([
      [
        RIDE.chapterId,
        new Map([
          [
            "user-pilot",
            [{ familyId: "basics", title: "Basics", status: course }],
          ],
        ]),
      ],
    ]),
    exemptions: new Map(),
  });
  (personProfiles.inPersonTrainingOf as jest.Mock).mockResolvedValue(
    new Map(
      inPerson
        ? [
            [
              "user-pilot",
              {
                confirmedAt: new Date(),
                confirmedByUserId: "user-admin",
              },
            ],
          ]
        : [],
    ),
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  trained("passed", true);
});

it("puts a pilot of the ride's chapter on the ride", async () => {
  getMemberRoles.mockResolvedValue(["pilot"]);
  await staffRide(RIDE, "user-pilot", "user-admin");
  expect(getMemberRoles).toHaveBeenCalledWith("user-pilot", "chapter-muenchen");
  expect(rides.assignVolunteer).toHaveBeenCalledWith(
    "ride-1",
    "user-pilot",
    "user-admin",
  );
});

// Being the chapter's admin is not being its pilot.
it("refuses someone who is not a pilot there", async () => {
  getMemberRoles.mockResolvedValue(["admin", "passenger"]);
  await expect(staffRide(RIDE, "user-admin", "user-admin")).rejects.toThrow(
    "notPilot",
  );
  expect(rides.assignVolunteer).not.toHaveBeenCalled();
  expect(training.readinessFacts).not.toHaveBeenCalled();
});

it("refuses a pilot who hasn't finished a required course", async () => {
  getMemberRoles.mockResolvedValue(["pilot"]);
  trained("inProgress", true);
  await expect(staffRide(RIDE, "user-pilot", "user-admin")).rejects.toThrow(
    "pilotNotReady",
  );
  expect(rides.assignVolunteer).not.toHaveBeenCalled();
});

it("puts an exempt pilot on the ride", async () => {
  getMemberRoles.mockResolvedValue(["pilot"]);
  trained("exempt", true);
  await staffRide(RIDE, "user-pilot", "user-admin");
  expect(rides.assignVolunteer).toHaveBeenCalled();
});

it("refuses a pilot whose in-person training isn't confirmed", async () => {
  getMemberRoles.mockResolvedValue(["pilot"]);
  trained("passed", false);
  await expect(staffRide(RIDE, "user-pilot", "user-admin")).rejects.toThrow(
    "pilotNotReady",
  );
  expect(rides.assignVolunteer).not.toHaveBeenCalled();
});

it("puts a not-ready pilot on the ride when training isn't required", async () => {
  process.env.TRAINING_REQUIRED = "false";
  try {
    getMemberRoles.mockResolvedValue(["pilot"]);
    trained("notStarted", false);
    await staffRide(RIDE, "user-pilot", "user-admin");
    expect(rides.assignVolunteer).toHaveBeenCalled();
    expect(training.readinessFacts).not.toHaveBeenCalled();
  } finally {
    process.env.TRAINING_REQUIRED = "true";
  }
});

it("still refuses a non-pilot when training isn't required", async () => {
  process.env.TRAINING_REQUIRED = "false";
  try {
    getMemberRoles.mockResolvedValue(["passenger"]);
    await expect(staffRide(RIDE, "user-pilot", "user-admin")).rejects.toThrow(
      "notPilot",
    );
  } finally {
    process.env.TRAINING_REQUIRED = "true";
  }
});
