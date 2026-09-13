import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { completeOnboardingProfile } from "@/use-cases/complete-onboarding-profile";

jest.mock("@/features/membership", () => ({
  membership: {
    listMembershipsOfUser: jest.fn(),
    listApplicationsOfUser: jest.fn(),
  },
}));
jest.mock("@/features/passengers", () => ({
  passengers: { saveOwnPassenger: jest.fn() },
}));
jest.mock("@/features/profile", () => ({
  profile: {
    completeOnboarding: jest.fn(),
    markManagesOthers: jest.fn(),
    setLocale: jest.fn(),
    setPersonalDetails: jest.fn(),
  },
}));

const listMemberships = membership.listMembershipsOfUser as jest.Mock;
const listApplications = membership.listApplicationsOfUser as jest.Mock;
const saveOwnPassenger = passengers.saveOwnPassenger as jest.Mock;
const completeOnboarding = profile.completeOnboarding as jest.Mock;
const markManagesOthers = profile.markManagesOthers as jest.Mock;
const setLocale = profile.setLocale as jest.Mock;
const setPersonalDetails = profile.setPersonalDetails as jest.Mock;

const USER = "user-pernille";
const CHAPTER = "chapter-muenchen";

const details = {
  firstName: "Pernille",
  lastName: "Holm",
  birthDate: new Date("1948-04-02"),
  gender: "female" as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  listMemberships.mockResolvedValue([
    { chapterId: CHAPTER, roles: ["passenger"] },
  ]);
  listApplications.mockResolvedValue([{ chapterId: CHAPTER }]);
});

describe("completeOnboardingProfile", () => {
  it("saves the details and closes onboarding against the chapter they joined", async () => {
    await completeOnboardingProfile({
      userId: USER,
      role: "passenger",
      details,
      locale: "da",
    });

    expect(setPersonalDetails).toHaveBeenCalledWith(USER, details);
    expect(saveOwnPassenger).toHaveBeenCalledWith(
      expect.objectContaining({ chapterId: CHAPTER, userId: USER }),
    );
    expect(completeOnboarding).toHaveBeenCalledWith(USER, {
      chapterId: CHAPTER,
      role: "passenger",
    });
  });

  // The welcome is rendered by the worker from the stored account language, so
  // the language has to be written before the event goes out.
  it("stores the language before it announces the welcome", async () => {
    await completeOnboardingProfile({
      userId: USER,
      role: "pilot",
      details,
      locale: "da",
    });

    expect(setLocale).toHaveBeenCalledWith(USER, "da");
    expect(setLocale.mock.invocationCallOrder[0]).toBeLessThan(
      completeOnboarding.mock.invocationCallOrder[0],
    );
  });

  /** A pilot's chapter is still an application at this point, not a membership. */
  it("takes a pilot's chapter from their application", async () => {
    listMemberships.mockResolvedValue([]);

    await completeOnboardingProfile({
      userId: USER,
      role: "pilot",
      details,
      locale: "en",
    });

    expect(completeOnboarding).toHaveBeenCalledWith(USER, {
      chapterId: CHAPTER,
      role: "pilot",
    });
    expect(saveOwnPassenger).not.toHaveBeenCalled();
  });

  it("closes onboarding with no chapter when nothing has been joined", async () => {
    listMemberships.mockResolvedValue([]);
    listApplications.mockResolvedValue([]);

    await completeOnboardingProfile({
      userId: USER,
      role: "pilot",
      details,
      locale: "en",
    });

    expect(completeOnboarding).toHaveBeenCalledWith(USER, {
      chapterId: null,
      role: "pilot",
    });
  });

  it("records a helper who filled the form in for someone else", async () => {
    await completeOnboardingProfile({
      userId: USER,
      role: "passenger",
      details: null,
      locale: "en",
      helperRelationship: "daughter",
    });

    expect(markManagesOthers).toHaveBeenCalledWith(USER, "daughter");
    expect(setPersonalDetails).not.toHaveBeenCalled();
    expect(completeOnboarding).toHaveBeenCalled();
  });
});
