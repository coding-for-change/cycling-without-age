import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { rides } from "@/features/rides";
import { domainCode } from "@/lib/domain-error";
import { signUpForRide, withdrawFromRide } from "./sign-up-for-ride";

jest.mock("@/features/chapters", () => ({
  chapters: { getSettings: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { getMemberRoles: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: {
    getRideScope: jest.fn(),
    selfAssign: jest.fn(),
    withdraw: jest.fn(),
  },
}));

const CHAPTER = "chapter-muenchen";
const getMemberRoles = membership.getMemberRoles as jest.Mock;
const getSettings = chapters.getSettings as jest.Mock;

const codeOf = (run: Promise<unknown>) =>
  run.then(
    () => null,
    (error) => domainCode(error),
  );

beforeEach(() => {
  jest.clearAllMocks();
  (rides.getRideScope as jest.Mock).mockResolvedValue({
    id: "ride-1",
    chapterId: CHAPTER,
    trishawIds: [],
  });
  getMemberRoles.mockResolvedValue(["pilot"]);
  getSettings.mockResolvedValue({
    pilotsMaySelfAssign: true,
    staffingCheckLeadHours: 24,
  });
  (rides.selfAssign as jest.Mock).mockResolvedValue(true);
});

describe("signUpForRide", () => {
  it("seats a pilot of the ride's own chapter", async () => {
    expect(await signUpForRide("ride-1", "pilot-1")).toBe(true);
    expect(getMemberRoles).toHaveBeenCalledWith("pilot-1", CHAPTER);
    expect(rides.selfAssign).toHaveBeenCalledWith("ride-1", "pilot-1");
  });

  // A country admin reaches the chapter, but holds no pilot role in it.
  it("refuses anyone who is not a pilot of that chapter", async () => {
    getMemberRoles.mockResolvedValue(["admin"]);
    expect(await codeOf(signUpForRide("ride-1", "country-admin"))).toBe(
      "notPilot",
    );
    getMemberRoles.mockResolvedValue([]);
    expect(await codeOf(signUpForRide("ride-1", "superadmin"))).toBe(
      "notPilot",
    );
    expect(rides.selfAssign).not.toHaveBeenCalled();
  });

  it("refuses where the chapter assigns its pilots itself", async () => {
    getSettings.mockResolvedValue({ pilotsMaySelfAssign: false });
    expect(await codeOf(signUpForRide("ride-1", "pilot-1"))).toBe(
      "selfSignUpOff",
    );
    expect(rides.selfAssign).not.toHaveBeenCalled();
  });

  it("refuses a ride that does not exist", async () => {
    (rides.getRideScope as jest.Mock).mockResolvedValue(null);
    expect(await codeOf(signUpForRide("ride-x", "pilot-1"))).toBe(
      "unknownRide",
    );
  });
});

describe("withdrawFromRide", () => {
  it("closes stepping back at the chapter's own staffing window", async () => {
    await withdrawFromRide("ride-1", "pilot-1");
    expect(rides.withdraw).toHaveBeenCalledWith("ride-1", "pilot-1", 24);
  });
});
