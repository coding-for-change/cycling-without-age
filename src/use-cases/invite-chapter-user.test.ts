import { accounts } from "@/features/accounts";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { personProfiles } from "@/features/person-profiles";
import { training } from "@/features/training";
import { activity } from "@/lib/activity";
import { inviteChapterUser } from "@/use-cases/invite-chapter-user";
import { pilotReadiness } from "@/use-cases/pilot-readiness";

jest.mock("@/features/accounts", () => ({
  accounts: { provisionUser: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { inviteMember: jest.fn() },
}));
const exempt = new Set<string>();
const confirmed = new Map<string, string>();

jest.mock("@/features/training", () => ({
  ...jest.requireActual("@/features/training/requirements"),
  training: {
    grantExemption: jest.fn(async (input: { userId: string }) => {
      exempt.add(input.userId);
    }),
    readinessFacts: jest.fn(
      async (
        groups: { chapter: { chapterId: string }; userIds: string[] }[],
      ) => ({
        families: new Map(),
        requirements: new Map(
          groups.map((g) => [g.chapter.chapterId, [{ familyId: "basics" }]]),
        ),
        statuses: new Map(
          groups.map((g) => [
            g.chapter.chapterId,
            new Map(
              g.userIds.map((userId) => [
                userId,
                [
                  {
                    familyId: "basics",
                    title: "Basics",
                    status: exempt.has(userId) ? "exempt" : "notStarted",
                  },
                ],
              ]),
            ),
          ]),
        ),
        exemptions: new Map(),
      }),
    ),
  },
}));
jest.mock("@/features/person-profiles", () => ({
  personProfiles: {
    confirmPilotStep: jest.fn(
      async (userId: string, _step: string, by: string) => {
        confirmed.set(userId, by);
      },
    ),
    inPersonTrainingOf: jest.fn(
      async (userIds: string[]) =>
        new Map(
          userIds
            .filter((userId) => confirmed.has(userId))
            .map((userId) => [
              userId,
              {
                confirmedAt: new Date(),
                confirmedByUserId: confirmed.get(userId),
              },
            ]),
        ),
    ),
  },
}));
jest.mock("@/features/chapters", () => ({
  chapters: { getChapterCountryId: jest.fn(async () => "country-de") },
}));
jest.mock("@/lib/activity", () => ({ activity: { record: jest.fn() } }));
jest.mock("@/use-cases/training-access", () => ({
  trainingContext: jest.fn(),
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfile: jest.fn(), setLocale: jest.fn() },
}));

const provisionUser = accounts.provisionUser as jest.Mock;
const inviteMember = membership.inviteMember as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const setLocale = profile.setLocale as jest.Mock;

const INVITER = "user-anke";
const INVITED = "user-new";
const CHAPTER = "chapter-muenchen";

const invite = (
  roles: ("admin" | "pilot")[] = ["pilot"],
  skipTraining?: boolean,
) =>
  inviteChapterUser({
    inviterUserId: INVITER,
    locale: "de",
    input: {
      chapterId: CHAPTER,
      name: "Pernille Holm",
      email: "p@example.com",
      roles,
      skipTraining,
    },
  });

beforeEach(() => {
  jest.clearAllMocks();
  exempt.clear();
  confirmed.clear();
  provisionUser.mockResolvedValue({ userId: INVITED, created: true });
  getProfile.mockResolvedValue({ email: "p@example.com", locale: null });
});

describe("inviteChapterUser", () => {
  it("provisions the account and hands the invitation to membership", async () => {
    await expect(invite()).resolves.toEqual({
      userId: "user-new",
      created: true,
    });

    expect(provisionUser).toHaveBeenCalledWith({
      name: "Pernille Holm",
      contact: "p@example.com",
      createdByUserId: INVITER,
    });
    expect(inviteMember).toHaveBeenCalledWith({
      userId: INVITED,
      chapterId: CHAPTER,
      actorUserId: INVITER,
      roles: ["pilot"],
    });
  });

  it("seeds the inviter's language into a new account without asking", async () => {
    await invite();

    expect(setLocale).toHaveBeenCalledWith(INVITED, "de");
    expect(getProfile).not.toHaveBeenCalled();
  });

  it("seeds it into an existing account that never chose one", async () => {
    provisionUser.mockResolvedValue({ userId: "user-old", created: false });

    await expect(invite(["admin"])).resolves.toEqual({
      userId: "user-old",
      created: false,
    });

    expect(setLocale).toHaveBeenCalledWith("user-old", "de");
    expect(inviteMember).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-old", roles: ["admin"] }),
    );
  });

  it("leaves an existing language alone", async () => {
    provisionUser.mockResolvedValue({ userId: "user-old", created: false });
    getProfile.mockResolvedValue({ email: "p@example.com", locale: "en" });

    await invite();

    expect(setLocale).not.toHaveBeenCalled();
    expect(inviteMember).toHaveBeenCalled();
  });

  it("passes both roles through in one invitation", async () => {
    await invite(["pilot", "admin"]);

    expect(inviteMember).toHaveBeenCalledWith(
      expect.objectContaining({ roles: ["pilot", "admin"] }),
    );
  });

  it("exempts an experienced pilot and confirms the in-person training, so they can ride at once", async () => {
    await expect(pilotReadiness(INVITED, CHAPTER)).resolves.toMatchObject({
      ready: false,
    });

    await invite(["pilot"], true);

    expect(training.grantExemption).toHaveBeenCalledWith(
      { userId: INVITED, familyId: null, reason: "experienced" },
      { grantedByUserId: INVITER, chapterId: CHAPTER },
    );
    expect(personProfiles.confirmPilotStep).toHaveBeenCalledWith(
      INVITED,
      "inPersonTraining",
      INVITER,
    );
    expect(activity.record).toHaveBeenCalledWith({
      userId: INVITED,
      actorUserId: INVITER,
      chapterId: CHAPTER,
      type: "inPersonTrainingConfirmed",
    });
    await expect(pilotReadiness(INVITED, CHAPTER)).resolves.toMatchObject({
      ready: true,
      coursesDone: true,
      inPerson: { confirmedBy: INVITER },
    });
  });

  it("grants no exemption unless asked, or when nobody is invited as pilot", async () => {
    await invite(["pilot"]);
    await invite(["admin"], true);

    expect(training.grantExemption).not.toHaveBeenCalled();
    expect(personProfiles.confirmPilotStep).not.toHaveBeenCalled();
    expect(activity.record).not.toHaveBeenCalled();
  });

  it("ignores skipTraining while training isn't required", async () => {
    process.env.TRAINING_REQUIRED = "false";
    try {
      await invite(["pilot"], true);
    } finally {
      process.env.TRAINING_REQUIRED = "true";
    }
    expect(inviteMember).toHaveBeenCalled();
    expect(training.grantExemption).not.toHaveBeenCalled();
    expect(personProfiles.confirmPilotStep).not.toHaveBeenCalled();
  });
});
