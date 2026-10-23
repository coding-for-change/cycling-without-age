import { admins } from "@/features/admins";
import {
  refreshSessionCookie,
  requireSuperAdmin,
  requireSuperAdminStepUp,
} from "@/lib/auth-guards";
import { DomainError } from "@/lib/domain-error";
import { inviteAdmin } from "@/use-cases/invite-admin";
import {
  inviteSuperadminAction,
  removeSuperadminAction,
  revokeSuperadminInviteAction,
} from "./actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/i18n", () => ({ getLocale: jest.fn(async () => "en") }));
jest.mock("@/lib/auth-guards", () => ({
  requireSuperAdmin: jest.fn(),
  requireSuperAdminStepUp: jest.fn(),
  refreshSessionCookie: jest.fn(),
}));
jest.mock("@/use-cases/invite-admin", () => ({ inviteAdmin: jest.fn() }));
jest.mock("@/features/admins", () => ({
  ...jest.requireActual("@/features/admins/schemas"),
  admins: { revokeInvite: jest.fn(), removeSuperadmin: jest.fn() },
}));

const stepUp = requireSuperAdminStepUp as jest.Mock;
const superAdmin = requireSuperAdmin as jest.Mock;
const invite = inviteAdmin as jest.Mock;
const remove = admins.removeSuperadmin as jest.Mock;
const revoke = admins.revokeInvite as jest.Mock;

const ANKE = { user: { id: "user-anke" } };
const INVITE = "0b9f6a0e-6f7a-4c43-9a51-1f2c3d4e5f60";
const invitee = { name: "Bo Holm", email: "Bo@Example.com" };

const forbidden = () => {
  throw new Error("FORBIDDEN");
};

beforeEach(() => {
  jest.clearAllMocks();
  stepUp.mockResolvedValue({ session: ANKE, fresh: true });
  superAdmin.mockResolvedValue(ANKE);
  remove.mockResolvedValue(undefined);
  revoke.mockResolvedValue(undefined);
  invite.mockResolvedValue({ userId: "user-bo", created: false });
});

describe("inviting a superadmin", () => {
  it("is only open to superadmins", async () => {
    stepUp.mockImplementation(forbidden);
    await expect(inviteSuperadminAction(invitee)).rejects.toThrow("FORBIDDEN");
    expect(invite).not.toHaveBeenCalled();
  });

  it("asks for a passkey first when the last one is older than five minutes", async () => {
    stepUp.mockResolvedValue({ session: ANKE, fresh: false });
    await expect(inviteSuperadminAction(invitee)).resolves.toEqual({
      ok: false,
      error: "stepUp",
    });
    expect(invite).not.toHaveBeenCalled();
  });

  it("invites with a normalised address as the signed-in superadmin", async () => {
    await expect(inviteSuperadminAction(invitee)).resolves.toEqual({
      ok: true,
    });
    expect(invite).toHaveBeenCalledWith({
      actorUserId: "user-anke",
      locale: "en",
      invitee: { name: "Bo Holm", email: "bo@example.com" },
      target: { kind: "superadmin" },
    });
  });

  it("rejects a malformed address before touching anything", async () => {
    await expect(
      inviteSuperadminAction({ name: "Bo", email: "not-an-email" }),
    ).resolves.toEqual({ ok: false, error: "generic" });
    expect(stepUp).not.toHaveBeenCalled();
  });
});

describe("removing a superadmin", () => {
  it("is only open to superadmins", async () => {
    stepUp.mockImplementation(forbidden);
    await expect(removeSuperadminAction("user-bo")).rejects.toThrow(
      "FORBIDDEN",
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it("asks for a fresh passkey", async () => {
    stepUp.mockResolvedValue({ session: ANKE, fresh: false });
    await expect(removeSuperadminAction("user-bo")).resolves.toEqual({
      ok: false,
      error: "stepUp",
    });
    expect(remove).not.toHaveBeenCalled();
  });

  it("explains that the last superadmin stays", async () => {
    remove.mockRejectedValue(new DomainError("lastSuperadmin"));
    await expect(removeSuperadminAction("user-anke")).resolves.toEqual({
      ok: false,
      error: "lastSuperadmin",
    });
  });

  it("refreshes the own session after stepping down", async () => {
    await removeSuperadminAction("user-anke");
    expect(remove).toHaveBeenCalledWith("user-anke", "user-anke");
    expect(refreshSessionCookie).toHaveBeenCalled();
  });

  it("leaves the own session alone when removing someone else", async () => {
    await removeSuperadminAction("user-bo");
    expect(refreshSessionCookie).not.toHaveBeenCalled();
  });
});

describe("withdrawing a superadmin invite", () => {
  it("is only open to superadmins", async () => {
    superAdmin.mockImplementation(forbidden);
    await expect(revokeSuperadminInviteAction(INVITE)).rejects.toThrow(
      "FORBIDDEN",
    );
    expect(revoke).not.toHaveBeenCalled();
  });

  it("only withdraws superadmin invites", async () => {
    await revokeSuperadminInviteAction(INVITE);
    expect(revoke).toHaveBeenCalledWith(INVITE, "superadmin");
  });

  it("ignores an id that is not an invite id", async () => {
    await expect(revokeSuperadminInviteAction("1")).resolves.toEqual({
      ok: false,
      error: "generic",
    });
    expect(revoke).not.toHaveBeenCalled();
  });
});
