import { admins } from "@/features/admins";
import { chapters } from "@/features/chapters";
import { profile } from "@/features/profile";
import { DomainError } from "@/lib/domain-error";
import { acceptAdminInvite } from "@/use-cases/accept-admin-invite";

jest.mock("@/features/admins", () => ({
  admins: {
    getInvite: jest.fn(),
    inviteStatusOf: jest.requireActual("@/features/admins/facade")
      .inviteStatusOf,
    acceptSuperadminInvite: jest.fn(),
    claimCountryAdminInvite: jest.fn(),
    releaseInvite: jest.fn(),
  },
}));
jest.mock("@/features/chapters", () => ({
  chapters: { appointCountryAdmin: jest.fn() },
}));
jest.mock("@/features/profile", () => ({
  profile: { countPasskeys: jest.fn() },
}));

const getInvite = admins.getInvite as jest.Mock;
const acceptSuperadmin = admins.acceptSuperadminInvite as jest.Mock;
const claimCountryAdmin = admins.claimCountryAdminInvite as jest.Mock;
const releaseInvite = admins.releaseInvite as jest.Mock;
const appointCountryAdmin = chapters.appointCountryAdmin as jest.Mock;
const countPasskeys = profile.countPasskeys as jest.Mock;

const INVITE = "0b9f6a0e-6f7a-4c43-9a51-1f2c3d4e5f60";
const BO = "user-bo";
const ANKE = "user-anke";
const DAY = 24 * 60 * 60 * 1000;

const invite = (overrides: Record<string, unknown> = {}) => ({
  id: INVITE,
  kind: "superadmin",
  countryId: null,
  userId: BO,
  invitedByUserId: ANKE,
  expiresAt: new Date(Date.now() + DAY),
  acceptedAt: null,
  revokedAt: null,
  ...overrides,
});

const nothingGranted = () => {
  expect(acceptSuperadmin).not.toHaveBeenCalled();
  expect(claimCountryAdmin).not.toHaveBeenCalled();
  expect(appointCountryAdmin).not.toHaveBeenCalled();
};

beforeEach(() => {
  jest.clearAllMocks();
  countPasskeys.mockResolvedValue(1);
});

describe("accepting an admin invite", () => {
  it("is bound to the invited account", async () => {
    getInvite.mockResolvedValue(invite());
    await expect(
      acceptAdminInvite({ inviteId: INVITE, userId: ANKE }),
    ).rejects.toMatchObject({ code: "notFound" });
    nothingGranted();
  });

  it("does not exist for an unknown id", async () => {
    getInvite.mockResolvedValue(null);
    await expect(
      acceptAdminInvite({ inviteId: INVITE, userId: BO }),
    ).rejects.toMatchObject({ code: "notFound" });
    nothingGranted();
  });

  it("needs a passkey before anything is granted", async () => {
    getInvite.mockResolvedValue(invite());
    countPasskeys.mockResolvedValue(0);
    await expect(
      acceptAdminInvite({ inviteId: INVITE, userId: BO }),
    ).rejects.toMatchObject({ code: "passkeyRequired" });
    nothingGranted();
  });

  it("refuses an invite older than seven days", async () => {
    getInvite.mockResolvedValue(
      invite({ expiresAt: new Date(Date.now() - 1) }),
    );
    await expect(
      acceptAdminInvite({ inviteId: INVITE, userId: BO }),
    ).rejects.toMatchObject({ code: "inviteExpired" });
    nothingGranted();
  });

  it("refuses a withdrawn invite", async () => {
    getInvite.mockResolvedValue(invite({ revokedAt: new Date() }));
    await expect(
      acceptAdminInvite({ inviteId: INVITE, userId: BO }),
    ).rejects.toMatchObject({ code: "inviteClosed" });
    nothingGranted();
  });

  it("answers a second click on an accepted invite without granting twice", async () => {
    getInvite.mockResolvedValue(invite({ acceptedAt: new Date() }));
    await expect(
      acceptAdminInvite({ inviteId: INVITE, userId: BO }),
    ).resolves.toEqual({ kind: "superadmin", countryId: null });
    nothingGranted();
  });

  it("makes the invitee a superadmin", async () => {
    getInvite.mockResolvedValue(invite());
    await acceptAdminInvite({ inviteId: INVITE, userId: BO });
    expect(acceptSuperadmin).toHaveBeenCalledWith(INVITE, BO);
    expect(appointCountryAdmin).not.toHaveBeenCalled();
  });

  it("makes the invitee a country admin of the invite's own country only", async () => {
    getInvite.mockResolvedValue(
      invite({ kind: "countryAdmin", countryId: "country-de" }),
    );
    claimCountryAdmin.mockResolvedValue(
      invite({ kind: "countryAdmin", countryId: "country-de" }),
    );
    await expect(
      acceptAdminInvite({ inviteId: INVITE, userId: BO }),
    ).resolves.toEqual({ kind: "countryAdmin", countryId: "country-de" });
    expect(appointCountryAdmin).toHaveBeenCalledWith(BO, "country-de", ANKE, {
      viaInvite: true,
    });
    expect(acceptSuperadmin).not.toHaveBeenCalled();
  });

  it("reopens the invite when the appointment fails", async () => {
    getInvite.mockResolvedValue(
      invite({ kind: "countryAdmin", countryId: "country-gone" }),
    );
    claimCountryAdmin.mockResolvedValue(
      invite({ kind: "countryAdmin", countryId: "country-gone" }),
    );
    appointCountryAdmin.mockRejectedValue(new DomainError("unknownCountry"));
    await expect(
      acceptAdminInvite({ inviteId: INVITE, userId: BO }),
    ).rejects.toMatchObject({ code: "unknownCountry" });
    expect(releaseInvite).toHaveBeenCalledWith(INVITE);
  });
});
