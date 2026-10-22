import { admins } from "@/features/admins";
import { requireSuperAdmin } from "@/lib/auth-guards";
import { DomainError } from "@/lib/domain-error";
import { inviteAdmin } from "@/use-cases/invite-admin";
import {
  inviteCountryAdminAction,
  revokeCountryAdminInviteAction,
} from "./actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/i18n", () => ({ getLocale: jest.fn(async () => "de") }));
jest.mock("@/lib/cache-tags", () => ({
  invalidateAccess: jest.fn(),
  invalidateAdminScopes: jest.fn(),
  invalidateReports: jest.fn(),
}));
jest.mock("@/lib/auth-guards", () => ({ requireSuperAdmin: jest.fn() }));
jest.mock("@/use-cases/invite-admin", () => ({ inviteAdmin: jest.fn() }));
jest.mock("@/use-cases/manage-country", () => ({ deleteCountry: jest.fn() }));
jest.mock("@/features/chapters", () => ({ chapters: {} }));
jest.mock("@/features/admins", () => ({
  ...jest.requireActual("@/features/admins/schemas"),
  admins: { revokeInvite: jest.fn() },
}));

const superAdmin = requireSuperAdmin as jest.Mock;
const invite = inviteAdmin as jest.Mock;
const revoke = admins.revokeInvite as jest.Mock;
const INVITE = "0b9f6a0e-6f7a-4c43-9a51-1f2c3d4e5f60";
const input = {
  countryId: "country-de",
  name: "Dana",
  email: "dana@example.com",
};

beforeEach(() => {
  jest.clearAllMocks();
  superAdmin.mockResolvedValue({ user: { id: "user-anke" } });
  invite.mockResolvedValue({ userId: "user-dana", created: true });
  revoke.mockResolvedValue(undefined);
});

describe("inviting a country admin", () => {
  it("stays a superadmin's call", async () => {
    superAdmin.mockImplementation(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(inviteCountryAdminAction(input)).rejects.toThrow("FORBIDDEN");
    expect(invite).not.toHaveBeenCalled();
  });

  it("invites into exactly the chosen country", async () => {
    await expect(inviteCountryAdminAction(input)).resolves.toEqual({
      ok: true,
    });
    expect(invite).toHaveBeenCalledWith({
      actorUserId: "user-anke",
      locale: "de",
      invitee: { name: "Dana", email: "dana@example.com" },
      target: { kind: "countryAdmin", countryId: "country-de" },
    });
  });

  it("says when the person already looks after the country", async () => {
    invite.mockRejectedValue(new DomainError("alreadyAdmin"));
    await expect(inviteCountryAdminAction(input)).resolves.toEqual({
      ok: false,
      error: "alreadyAdmin",
    });
  });

  it("only withdraws country admin invites", async () => {
    await revokeCountryAdminInviteAction(INVITE);
    expect(revoke).toHaveBeenCalledWith(INVITE, "countryAdmin");
  });
});
