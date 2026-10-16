import { requireSuperAdmin } from "@/lib/auth-guards";
import { DomainError } from "@/lib/domain-error";
import { deleteAccount } from "@/use-cases/delete-account";
import { deleteUserAction } from "./actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/cache-tags", () => ({
  expirePasskeys: jest.fn(),
  invalidateAccess: jest.fn(),
  invalidateReports: jest.fn(),
}));
jest.mock("@/lib/auth-guards", () => ({
  requireAuth: jest.fn(),
  requireChapterAdmin: jest.fn(),
  requireSuperAdmin: jest.fn(async () => ({ user: { id: "superadmin" } })),
}));
jest.mock("@/features/membership", () => ({ membership: {} }));
jest.mock("@/features/person-profiles", () => ({ PILOT_STEPS: ["training"] }));
jest.mock("@/use-cases/delete-account", () => ({ deleteAccount: jest.fn() }));
jest.mock("@/use-cases/pilot-steps", () => ({
  confirmPilotStep: jest.fn(),
  revokePilotStep: jest.fn(),
}));

const removeAccount = deleteAccount as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  removeAccount.mockResolvedValue(undefined);
});

describe("deleteUserAction", () => {
  it("forwards the riders the superadmin confirmed to the delete", async () => {
    await expect(
      deleteUserAction({
        userId: "daughter-lena",
        removeRiders: ["managed-greta"],
      }),
    ).resolves.toEqual({ ok: true });
    expect(removeAccount).toHaveBeenCalledWith("daughter-lena", "superadmin", {
      removeRiders: ["managed-greta"],
    });
  });

  it("removes no riders when none were confirmed", async () => {
    await expect(deleteUserAction({ userId: "pilot-anna" })).resolves.toEqual({
      ok: true,
    });
    expect(removeAccount).toHaveBeenCalledWith("pilot-anna", "superadmin", {
      removeRiders: [],
    });
  });

  it("deletes nothing when the confirmed riders are not a list of ids", async () => {
    await expect(
      deleteUserAction({
        userId: "daughter-lena",
        removeRiders: true,
      } as never),
    ).resolves.toEqual({ ok: false, error: "generic" });
    await expect(
      deleteUserAction({ userId: "daughter-lena", removeRiders: [""] }),
    ).resolves.toEqual({ ok: false, error: "generic" });
    expect(requireSuperAdmin).not.toHaveBeenCalled();
    expect(removeAccount).not.toHaveBeenCalled();
  });

  it("answers managesRiders when riders are left the superadmin did not confirm", async () => {
    removeAccount.mockRejectedValue(new DomainError("managesRiders"));

    await expect(
      deleteUserAction({ userId: "daughter-lena" }),
    ).resolves.toEqual({ ok: false, error: "managesRiders" });
  });
});
