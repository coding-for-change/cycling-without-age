import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { EMPTY_PRESET } from "@/lib/join-preset";
import type { Access } from "@/lib/access";
import { PASSKEY_REPROMPT_MS } from "@/lib/onboarding";
import {
  getOnboardingState,
  resolveDestination,
} from "@/use-cases/onboarding-progress";

jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: {
    listMembershipsOfUser: jest.fn(),
    listApplicationsOfUser: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfile: jest.fn() },
}));

const getProfile = profile.getProfile as jest.Mock;
const listMemberships = membership.listMembershipsOfUser as jest.Mock;
const listApplications = membership.listApplicationsOfUser as jest.Mock;

const CHAPTER = "chapter-muenchen";
const NEXT = "/join/muenchen/ride";

type Account = {
  managesOthers: boolean;
  birthDate: Date | null;
  gender: string | null;
  consentDataAt: Date | null;
  consentSafetyAt: Date | null;
  passkeyPromptedAt: Date | null;
  pilotNextStepsSeenAt: Date | null;
  _count: { passkeys: number; passengers: number };
};

const DONE: Account = {
  managesOthers: false,
  birthDate: new Date("1950-04-01"),
  gender: "female",
  consentDataAt: new Date("2026-01-01"),
  consentSafetyAt: new Date("2026-01-01"),
  passkeyPromptedAt: null,
  pilotNextStepsSeenAt: new Date("2026-01-01"),
  _count: { passkeys: 1, passengers: 1 },
};

const session: { user: { id: string }; access: Access } = {
  user: { id: "u1" },
  access: {
    role: null,
    countryAdminOf: [],
    memberships: [{ chapterId: CHAPTER, roles: ["passenger"] }],
  },
};

const account = (overrides: Partial<Account> = {}) =>
  getProfile.mockResolvedValue({ ...DONE, ...overrides });

beforeEach(() => {
  jest.clearAllMocks();
  account();
  listMemberships.mockResolvedValue([
    { chapterId: CHAPTER, roles: ["passenger"] },
  ]);
  listApplications.mockResolvedValue([]);
});

describe("resolveDestination", () => {
  it("spends the parked destination once onboarding is finished", async () => {
    await expect(resolveDestination(session, EMPTY_PRESET, NEXT)).resolves.toBe(
      NEXT,
    );
  });

  it("falls back to the role's home when nothing was parked", async () => {
    await expect(resolveDestination(session, EMPTY_PRESET)).resolves.toBe(
      "/passenger",
    );
  });

  // Landing on a page the account is not ready for is worse than a detour.
  it("ignores it while a step is still open", async () => {
    account({ consentDataAt: null });
    await expect(resolveDestination(session, EMPTY_PRESET, NEXT)).resolves.toBe(
      "/onboarding/consent",
    );
  });
});

describe("the passkey re-prompt", () => {
  const promptedAgo = (ms: number) =>
    account({
      passkeyPromptedAt: new Date(Date.now() - ms),
      _count: { passkeys: 0, passengers: 1 },
    });

  it("stays answered inside the window", async () => {
    promptedAgo(PASSKEY_REPROMPT_MS / 2);
    const { progress } = await getOnboardingState("u1", EMPTY_PRESET);
    expect(progress.passkeyHandled).toBe(true);
  });

  it("re-opens once the window has passed", async () => {
    promptedAgo(PASSKEY_REPROMPT_MS + 24 * 60 * 60 * 1000);
    const { progress } = await getOnboardingState("u1", EMPTY_PRESET);
    expect(progress.passkeyHandled).toBe(false);
  });

  it("never asks again once a passkey exists", async () => {
    account({ passkeyPromptedAt: new Date(0) });
    const { progress } = await getOnboardingState("u1", EMPTY_PRESET);
    expect(progress.passkeyHandled).toBe(true);
  });
});
