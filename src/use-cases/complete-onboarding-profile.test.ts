import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import {
  completeCaretakerOnboarding,
  completeOnboardingProfile,
} from "@/use-cases/complete-onboarding-profile";

jest.mock("@/features/membership", () => ({
  membership: {
    listMembershipsOfUser: jest.fn(),
    listApplicationsOfUser: jest.fn(),
  },
}));
jest.mock("@/features/passengers", () => ({
  passengers: {
    saveOwnPassenger: jest.fn(),
    addManagedPassengers: jest.fn(),
    listPassengersManagedBy: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({
  profile: {
    completeOnboarding: jest.fn(),
    markManagesOthers: jest.fn(),
    setLocale: jest.fn(),
    setPersonalDetails: jest.fn(),
    updateOwnDetails: jest.fn(),
  },
}));

const listMemberships = membership.listMembershipsOfUser as jest.Mock;
const listApplications = membership.listApplicationsOfUser as jest.Mock;
const saveOwnPassenger = passengers.saveOwnPassenger as jest.Mock;
const addManagedPassengers = passengers.addManagedPassengers as jest.Mock;
const listManaged = passengers.listPassengersManagedBy as jest.Mock;
const updateOwnDetails = profile.updateOwnDetails as jest.Mock;
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
  listManaged.mockResolvedValue([]);
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

  it("adds every rider a caretaker books for and closes onboarding as a passenger", async () => {
    const riders = [
      { ...details, pickup: { residence: "careHome" as const } },
      { ...details, firstName: "Jens" },
    ];

    await completeCaretakerOnboarding({
      userId: USER,
      name: "Mette Holm",
      relationship: "child",
      riders,
      locale: "da",
    });

    expect(addManagedPassengers).toHaveBeenCalledWith(USER, CHAPTER, riders);
    expect(updateOwnDetails).toHaveBeenCalledWith(USER, { name: "Mette Holm" });
    expect(markManagesOthers).toHaveBeenCalledWith(USER, "child");
    expect(saveOwnPassenger).not.toHaveBeenCalled();
    expect(completeOnboarding).toHaveBeenCalledWith(USER, {
      chapterId: CHAPTER,
      role: "passenger",
    });
  });

  it("saves the caretaker before the riders and closes onboarding last", async () => {
    await completeCaretakerOnboarding({
      userId: USER,
      name: "Mette Holm",
      relationship: "child",
      riders: [details],
      locale: "da",
    });

    const order = [
      updateOwnDetails,
      markManagesOthers,
      setLocale,
      addManagedPassengers,
      completeOnboarding,
    ].map((mock) => mock.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("does not add the riders twice when a retry follows a failed finish", async () => {
    completeOnboarding.mockRejectedValueOnce(new Error("mail down"));
    const input = {
      userId: USER,
      name: "Mette Holm",
      riders: [details],
      locale: "da" as const,
    };

    await expect(completeCaretakerOnboarding(input)).rejects.toThrow();
    listManaged.mockResolvedValue([
      { id: "passenger-own", userId: USER },
      { id: "passenger-inge", userId: null },
    ]);
    await completeCaretakerOnboarding(input);

    expect(addManagedPassengers).toHaveBeenCalledTimes(1);
    expect(completeOnboarding).toHaveBeenCalledTimes(2);
  });

  it("still adds riders when the only passenger managed is the caretaker", async () => {
    listManaged.mockResolvedValue([{ id: "passenger-own", userId: USER }]);

    await completeCaretakerOnboarding({
      userId: USER,
      name: "Mette Holm",
      riders: [details],
      locale: "da",
    });

    expect(addManagedPassengers).toHaveBeenCalledWith(USER, CHAPTER, [details]);
  });

  it("refuses a caretaker who has not joined a chapter", async () => {
    listMemberships.mockResolvedValue([]);

    await expect(
      completeCaretakerOnboarding({
        userId: USER,
        name: "Mette Holm",
        riders: [details],
        locale: "da",
      }),
    ).rejects.toMatchObject({ code: "notChapterMember" });
    expect(addManagedPassengers).not.toHaveBeenCalled();
  });
});
