import { accounts } from "@/features/accounts";
import { canDeleteOwnAccount } from "@/lib/access";
import { requireAuth, requireChapterAdmin } from "@/lib/auth-guards";
import { DomainError } from "@/lib/domain-error";
import { deleteAccount } from "@/use-cases/delete-account";
import { provisionAssistedPassenger } from "@/use-cases/provision-assisted-passenger";
import {
  addAssistedPassenger,
  deleteOwnAccountAction,
  keepNativeAppleRefreshTokenAction,
} from "./actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/cache-tags", () => ({
  expirePasskeys: jest.fn(),
  invalidateReports: jest.fn(),
  invalidateAccess: jest.fn(),
}));
jest.mock("@/lib/auth-guards", () => ({
  requireAuth: jest.fn(),
  requireChapterAdmin: jest.fn(),
}));
jest.mock("@/lib/access", () => ({ canDeleteOwnAccount: jest.fn() }));
jest.mock("@/features/accounts", () => ({
  accounts: { keepNativeAppleRefreshToken: jest.fn() },
}));
jest.mock("@/lib/avatar", () => ({
  avatarSeed: jest.fn(),
  avatarSvg: jest.fn(),
}));
jest.mock("@/lib/i18n", () => ({ getLocale: jest.fn() }));
jest.mock("@/features/profile", () =>
  jest.requireActual("@/features/profile/schemas"),
);
jest.mock("@/use-cases/invite-chapter-user", () => ({
  inviteChapterUser: jest.fn(),
}));
jest.mock("@/use-cases/delete-account", () => ({ deleteAccount: jest.fn() }));
jest.mock("@/use-cases/provision-assisted-passenger", () => ({
  provisionAssistedPassenger: jest.fn(),
}));

const guard = requireChapterAdmin as jest.Mock;
const provision = provisionAssistedPassenger as jest.Mock;
const signedIn = requireAuth as jest.Mock;
const removeAccount = deleteAccount as jest.Mock;

const signInAs = (id: string) =>
  signedIn.mockResolvedValue({
    user: { id },
    access: { role: null, countryAdminOf: [], memberships: [] },
  });

const ADMINS_CHAPTER = "chapter-muenchen";
const input = (chapterId: string) => ({
  chapterId,
  firstName: "Inge",
  lastName: "Holm",
  birthDate: "1939-07-30",
  gender: "female",
  contact: "hilde@example.com",
  helper: {
    name: "Hilde Holm",
    relationship: "child",
    contact: "hilde@example.com",
  },
  pickup: {
    residence: "home",
    address: "Leopoldstraße 1, München",
    latitude: 48.15,
    longitude: 11.58,
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  guard.mockImplementation(async (chapterId: string) => {
    if (chapterId !== ADMINS_CHAPTER) throw new Error("forbidden");
    return { user: { id: "admin-1" } };
  });
  provision.mockResolvedValue({ userId: "user-hilde", outcome: "sent" });
  (canDeleteOwnAccount as jest.Mock).mockReturnValue(true);
  removeAccount.mockResolvedValue(undefined);
});

describe("addAssistedPassenger", () => {
  it("reports a helper request as sent whether or not they have an account", async () => {
    await expect(addAssistedPassenger(input(ADMINS_CHAPTER))).resolves.toEqual({
      ok: true,
      outcome: "sent",
    });
    expect(provision).toHaveBeenCalledWith({
      adminUserId: "admin-1",
      input: expect.objectContaining({
        pickup: expect.objectContaining({ residence: "home" }),
      }),
    });
  });

  it("refuses an admin of another chapter", async () => {
    await expect(
      addAssistedPassenger(input("chapter-koebenhavn")),
    ).rejects.toThrow("forbidden");
    expect(provision).not.toHaveBeenCalled();
  });

  it("does not reveal that a contact belongs to another chapter", async () => {
    provision.mockRejectedValue(new DomainError("passengerChapterMismatch"));
    await expect(addAssistedPassenger(input(ADMINS_CHAPTER))).resolves.toEqual({
      ok: false,
      error: "exists",
    });
  });
});

describe("deleteOwnAccountAction", () => {
  it("forwards the riders the account holder confirmed to the delete", async () => {
    signInAs("daughter-lena");

    await expect(
      deleteOwnAccountAction({ removeRiders: ["managed-greta"] }),
    ).resolves.toEqual({ ok: true });
    expect(removeAccount).toHaveBeenCalledWith(
      "daughter-lena",
      "daughter-lena",
      { removeRiders: ["managed-greta"] },
    );
  });

  it("removes no riders when none were confirmed", async () => {
    signInAs("pilot-anna");

    await expect(deleteOwnAccountAction()).resolves.toEqual({ ok: true });
    expect(removeAccount).toHaveBeenCalledWith("pilot-anna", "pilot-anna", {
      removeRiders: [],
    });
  });

  it("deletes nothing when the confirmed riders are not a list of ids", async () => {
    signInAs("son-jens");

    await expect(
      deleteOwnAccountAction({ removeRiders: true }),
    ).resolves.toEqual({ ok: false, error: "generic" });
    await expect(
      deleteOwnAccountAction({ removeRiders: [""] }),
    ).resolves.toEqual({ ok: false, error: "generic" });
    expect(removeAccount).not.toHaveBeenCalled();
  });

  it("answers managesRiders when riders are left the holder did not confirm", async () => {
    signInAs("carer-mette");
    removeAccount.mockRejectedValue(new DomainError("managesRiders"));

    await expect(deleteOwnAccountAction()).resolves.toEqual({
      ok: false,
      error: "managesRiders",
    });
  });
});

describe("keepNativeAppleRefreshTokenAction", () => {
  it("keeps the token for the signed-in account only", async () => {
    signInAs("pilot-anna");

    await expect(keepNativeAppleRefreshTokenAction("code-1")).resolves.toEqual({
      ok: true,
    });
    expect(accounts.keepNativeAppleRefreshToken).toHaveBeenCalledWith(
      "pilot-anna",
      "code-1",
    );
  });

  it("ignores anything that is not an authorization code", async () => {
    signInAs("pilot-anna");

    await expect(
      keepNativeAppleRefreshTokenAction({ code: "x" }),
    ).resolves.toEqual({
      ok: false,
      error: "generic",
    });
    await expect(keepNativeAppleRefreshTokenAction("")).resolves.toEqual({
      ok: false,
      error: "generic",
    });
    expect(accounts.keepNativeAppleRefreshToken).not.toHaveBeenCalled();
  });

  it("needs a session", async () => {
    signedIn.mockRejectedValue(new Error("unauthorized"));

    await expect(keepNativeAppleRefreshTokenAction("code-1")).rejects.toThrow(
      "unauthorized",
    );
    expect(accounts.keepNativeAppleRefreshToken).not.toHaveBeenCalled();
  });
});
