import { adminInvited, superadminRemoved } from "./admin-invite";
import { countryAdminAppointed } from "./country-admin";

jest.mock("./lookups", () => ({
  nameOfCountry: jest.fn(async () => "Deutschland"),
  nameOfPerson: jest.fn(async () => "Anke"),
}));

const appointed = (viaInvite: boolean) => ({
  type: "countryAdmin.appointed" as const,
  countryId: "country-de",
  userId: "user-bo",
  actorUserId: "user-anke",
  viaInvite,
});

describe("admin role notifications", () => {
  it("sends the invite to the invitee, linking to the invite through sign-in", async () => {
    const event = {
      type: "adminInvite.created" as const,
      inviteId: "invite-1",
      kind: "superadmin" as const,
      countryId: null,
      userId: "user-bo",
      actorUserId: "user-anke",
    };
    await expect(adminInvited.recipients(event)).resolves.toEqual(["user-bo"]);
    expect(adminInvited.href(event)).toBe(
      `/sign-in?next=${encodeURIComponent("/admin-invite/invite-1")}`,
    );
  });

  it("stays silent about the appointment an accepted invite made", async () => {
    await expect(
      countryAdminAppointed.recipients(appointed(true)),
    ).resolves.toEqual([]);
  });

  it("still tells someone appointed outside an invite", async () => {
    await expect(
      countryAdminAppointed.recipients(appointed(false)),
    ).resolves.toEqual(["user-bo"]);
  });

  it("does not mail someone who stepped down themselves", async () => {
    await expect(
      superadminRemoved.recipients({
        type: "superadmin.removed",
        userId: "user-anke",
        actorUserId: "user-anke",
      }),
    ).resolves.toEqual([]);
  });
});
