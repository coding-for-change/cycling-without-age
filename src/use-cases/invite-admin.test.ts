import { accounts } from "@/features/accounts";
import { admins } from "@/features/admins";
import { chapters } from "@/features/chapters";
import { profile } from "@/features/profile";
import { inviteAdmin } from "@/use-cases/invite-admin";

jest.mock("@/features/accounts", () => ({
  accounts: { provisionUser: jest.fn() },
}));
jest.mock("@/features/admins", () => ({
  admins: { createInvite: jest.fn() },
}));
jest.mock("@/features/chapters", () => ({
  chapters: { getCountry: jest.fn(), listCountriesAdministeredBy: jest.fn() },
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfile: jest.fn(), setLocale: jest.fn() },
}));

const provisionUser = accounts.provisionUser as jest.Mock;
const createInvite = admins.createInvite as jest.Mock;
const getCountry = chapters.getCountry as jest.Mock;
const administeredBy = chapters.listCountriesAdministeredBy as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const setLocale = profile.setLocale as jest.Mock;

const ANKE = "user-anke";
const invitee = { name: "Bo Holm", email: "bo@example.com" };

beforeEach(() => {
  jest.clearAllMocks();
  provisionUser.mockResolvedValue({ userId: "user-bo", created: false });
  createInvite.mockResolvedValue({ inviteId: "invite-1" });
  getCountry.mockResolvedValue({ id: "country-de", name: "Deutschland" });
  administeredBy.mockResolvedValue([]);
  getProfile.mockResolvedValue({ locale: "da" });
});

describe("inviting an admin", () => {
  it("creates an account for an unknown address instead of failing", async () => {
    provisionUser.mockResolvedValue({ userId: "user-new", created: true });
    await expect(
      inviteAdmin({
        actorUserId: ANKE,
        locale: "de",
        invitee,
        target: { kind: "countryAdmin", countryId: "country-de" },
      }),
    ).resolves.toEqual({
      userId: "user-new",
      created: true,
      inviteId: "invite-1",
    });
    expect(provisionUser).toHaveBeenCalledWith({
      name: "Bo Holm",
      contact: "bo@example.com",
      createdByUserId: ANKE,
    });
    expect(setLocale).toHaveBeenCalledWith("user-new", "de");
  });

  it("keeps an existing account's language", async () => {
    await inviteAdmin({
      actorUserId: ANKE,
      locale: "de",
      invitee,
      target: { kind: "superadmin" },
    });
    expect(setLocale).not.toHaveBeenCalled();
  });

  it("invites a superadmin without any country", async () => {
    await inviteAdmin({
      actorUserId: ANKE,
      locale: "en",
      invitee,
      target: { kind: "superadmin" },
    });
    expect(createInvite).toHaveBeenCalledWith({
      kind: "superadmin",
      userId: "user-bo",
      actorUserId: ANKE,
    });
  });

  it("scopes a country admin invite to the named country", async () => {
    await inviteAdmin({
      actorUserId: ANKE,
      locale: "en",
      invitee,
      target: { kind: "countryAdmin", countryId: "country-de" },
    });
    expect(createInvite).toHaveBeenCalledWith({
      kind: "countryAdmin",
      countryId: "country-de",
      userId: "user-bo",
      actorUserId: ANKE,
    });
  });

  it("refuses a country that does not exist before creating any account", async () => {
    getCountry.mockResolvedValue(null);
    await expect(
      inviteAdmin({
        actorUserId: ANKE,
        locale: "en",
        invitee,
        target: { kind: "countryAdmin", countryId: "country-ghost" },
      }),
    ).rejects.toMatchObject({ code: "unknownCountry" });
    expect(provisionUser).not.toHaveBeenCalled();
    expect(createInvite).not.toHaveBeenCalled();
  });

  it("refuses someone who already looks after the country", async () => {
    administeredBy.mockResolvedValue(["country-de"]);
    await expect(
      inviteAdmin({
        actorUserId: ANKE,
        locale: "en",
        invitee,
        target: { kind: "countryAdmin", countryId: "country-de" },
      }),
    ).rejects.toMatchObject({ code: "alreadyAdmin" });
    expect(createInvite).not.toHaveBeenCalled();
  });
});
