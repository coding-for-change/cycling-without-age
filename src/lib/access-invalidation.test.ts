import {
  expirePasskeys,
  invalidateAccess,
  invalidateAdminScopes,
} from "@/lib/cache-tags";
import { membership } from "@/features/membership";
import { chapters } from "@/features/chapters";
import { deleteCountry } from "@/use-cases/manage-country";
import { appointCountryAdminByEmail } from "@/use-cases/manage-country-admins";
import { inviteChapterUser as invite } from "@/use-cases/invite-chapter-user";
import { provisionAssistedPassenger } from "@/use-cases/provision-assisted-passenger";
import { createChapter } from "@/use-cases/manage-chapter";
import {
  changeMemberRoleAction,
  decideApplicationAction,
  deleteUserAction,
} from "@/app/admin/members/actions";
import {
  appointCountryAdminAction,
  createCountryAction,
  deleteCountryAction,
  removeCountryAdminAction,
  updateCountryAction,
} from "@/app/admin/countries/actions";
import {
  createChapterAction,
  deleteChapterAction,
  updateChapterAction,
} from "@/app/admin/chapters/actions";
import {
  addAssistedPassenger,
  deleteOwnAccountAction,
  inviteChapterUser,
} from "@/features/accounts/actions";
import { joinChapterAsPassenger } from "@/features/membership/actions";
import { acceptCareRequestAction } from "@/features/passengers/actions";
import {
  settleCaretakerAt,
  settlePassengerAt,
} from "@/app/(flow)/location/actions";

const passthrough = {
  safeParse: (data: unknown) => ({ success: true, data }),
};

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("@/lib/cache-tags", () => ({
  expirePasskeys: jest.fn(),
  invalidateAccess: jest.fn(),
  invalidateAdminScopes: jest.fn(),
  invalidateReports: jest.fn(),
}));
jest.mock("@/lib/auth-guards", () => {
  const as = (id: string) => async () => ({
    user: { id },
    access: { role: null, countryAdminOf: [], memberships: [] },
  });
  return {
    requireAuth: jest.fn(as("viewer")),
    requireChapterAdmin: jest.fn(as("chapter-admin")),
    requireCountryAdmin: jest.fn(as("country-admin")),
    requireCountryAdminOfChapter: jest.fn(as("country-admin")),
    requireSuperAdmin: jest.fn(as("superadmin")),
    requireAdminScope: jest.fn(),
    readNextPath: jest.fn(async () => null),
  };
});
jest.mock("@/lib/access", () => ({ canDeleteOwnAccount: () => true }));
jest.mock("@/lib/avatar", () => ({
  avatarSeed: jest.fn(),
  avatarSvg: jest.fn(),
}));
jest.mock("@/lib/i18n", () => ({ getLocale: jest.fn(async () => "de") }));
jest.mock("@/lib/mapbox", () => ({}));
jest.mock("@/lib/join-preset", () => ({ EMPTY_PRESET: {} }));
jest.mock("@/features/profile", () =>
  jest.requireActual("@/features/profile/schemas"),
);
jest.mock("@/features/person-profiles", () => ({ PILOT_STEPS: ["training"] }));
jest.mock("@/features/membership", () => ({
  MAX_PILOT_CHAPTERS: 3,
  membership: {
    getApplication: jest.fn(),
    decideApplication: jest.fn(),
    changeMemberRole: jest.fn(),
    joinAsPassenger: jest.fn(),
  },
}));
jest.mock("@/features/chapters", () => ({
  countryInput: { safeParse: (data: unknown) => ({ success: true, data }) },
  countryUpdateInput: {
    safeParse: (data: unknown) => ({ success: true, data }),
  },
  chapterInput: { safeParse: (data: unknown) => ({ success: true, data }) },
  chapterUpdateInput: {
    safeParse: (data: unknown) => ({ success: true, data }),
  },
  chapters: {
    createCountry: jest.fn(async () => ({ id: "country-dk" })),
    updateCountry: jest.fn(),
    removeCountryAdmin: jest.fn(),
    getChapter: jest.fn(async () => ({ id: "chapter-muenchen" })),
  },
}));
jest.mock("@/use-cases/delete-account", () => ({ deleteAccount: jest.fn() }));
jest.mock("@/use-cases/pilot-steps", () => ({
  confirmInPersonTraining: jest.fn(),
  revokeInPersonTraining: jest.fn(),
  grantTrainingExemption: jest.fn(),
  revokeTrainingExemption: jest.fn(),
}));
jest.mock("@/use-cases/manage-country", () => ({ deleteCountry: jest.fn() }));
jest.mock("@/use-cases/manage-country-admins", () => ({
  appointCountryAdminByEmail: jest.fn(),
}));
jest.mock("@/use-cases/manage-chapter", () => ({
  createChapter: jest.fn(),
  updateChapter: jest.fn(),
  deleteChapter: jest.fn(),
}));
jest.mock("@/use-cases/invite-chapter-user", () => ({
  inviteChapterUser: jest.fn(),
}));
jest.mock("@/use-cases/provision-assisted-passenger", () => ({
  provisionAssistedPassenger: jest.fn(),
}));
jest.mock("@/use-cases/respond-care-request", () => ({
  acceptCareRequest: jest.fn(),
  declineCareRequest: jest.fn(),
}));
jest.mock("@/use-cases/add-managed-rider", () => ({
  addManagedRider: jest.fn(),
}));
jest.mock("@/use-cases/manage-rider", () => ({
  updateManagedRider: jest.fn(),
  removeManagedRider: jest.fn(),
}));
jest.mock("@/use-cases/onboarding-progress", () => ({
  resolveDestination: jest.fn(async () => "/passenger"),
}));
jest.mock("@/use-cases/settle-passenger-location", () => ({
  settlePassengerLocation: jest.fn(),
  settleCaretakerLocation: jest.fn(),
}));

const invalidated = invalidateAccess as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("every write that changes a session's access expires it", () => {
  it("approving a pilot application", async () => {
    (membership.getApplication as jest.Mock).mockResolvedValue({
      chapterId: "chapter-muenchen",
      userId: "pilot-anna",
    });
    await expect(
      decideApplicationAction({ applicationId: "app-1", approve: true }),
    ).resolves.toEqual({ ok: true });
    expect(invalidated).toHaveBeenCalledWith({ userIds: ["pilot-anna"] });
  });

  it("promoting, demoting or removing a member", async () => {
    await changeMemberRoleAction({
      userId: "member-bo",
      chapterId: "chapter-muenchen",
      change: "remove",
    });
    expect(invalidated).toHaveBeenCalledWith({ userIds: ["member-bo"] });
  });

  it("deleting a user", async () => {
    await expect(deleteUserAction({ userId: "member-bo" })).resolves.toEqual({
      ok: true,
    });
    expect(invalidated).toHaveBeenCalledWith({ userIds: ["member-bo"] });
    expect(expirePasskeys).toHaveBeenCalledWith("member-bo");
  });

  it("deleting a country, with every chapter it cascades into", async () => {
    (deleteCountry as jest.Mock).mockResolvedValue({
      chapterIds: ["chapter-muenchen", "chapter-berlin"],
    });
    await expect(deleteCountryAction("country-de")).resolves.toEqual({
      ok: true,
    });
    expect(invalidated).toHaveBeenCalledWith({ countryIds: ["country-de"] });
    expect(invalidated).toHaveBeenCalledWith({
      chapterIds: ["chapter-muenchen", "chapter-berlin"],
    });
    expect(invalidateAdminScopes).toHaveBeenCalled();
  });

  it("a country delete that fails after its write still expires the country", async () => {
    (deleteCountry as jest.Mock).mockRejectedValue(new Error("activity"));
    await deleteCountryAction("country-de");
    expect(invalidated).toHaveBeenCalledWith({ countryIds: ["country-de"] });
    expect(invalidateAdminScopes).toHaveBeenCalled();
  });

  it("appointing a country admin", async () => {
    (appointCountryAdminByEmail as jest.Mock).mockResolvedValue({
      userId: "dana",
    });
    await expect(
      appointCountryAdminAction({
        countryId: "country-de",
        email: "dana@example.com",
      }),
    ).resolves.toEqual({ ok: true });
    expect(invalidated).toHaveBeenCalledWith({ userIds: ["dana"] });
  });

  it("not expiring anyone when the appointee has no account", async () => {
    (appointCountryAdminByEmail as jest.Mock).mockResolvedValue(null);
    await expect(
      appointCountryAdminAction({
        countryId: "country-de",
        email: "nobody@example.com",
      }),
    ).resolves.toEqual({ ok: false, error: "noAccount" });
    expect(invalidated).not.toHaveBeenCalled();
  });

  it("removing a country admin", async () => {
    await removeCountryAdminAction({ countryId: "country-de", userId: "dana" });
    expect(invalidated).toHaveBeenCalledWith({ userIds: ["dana"] });
  });

  it("deleting a chapter, with all of its members", async () => {
    await expect(deleteChapterAction("chapter-muenchen")).resolves.toEqual({
      ok: true,
    });
    expect(invalidated).toHaveBeenCalledWith({
      chapterIds: ["chapter-muenchen"],
    });
    expect(invalidateAdminScopes).toHaveBeenCalled();
  });

  it("inviting someone into a chapter", async () => {
    (invite as jest.Mock).mockResolvedValue({
      userId: "invitee",
      created: true,
    });
    await expect(
      inviteChapterUser({
        chapterId: "chapter-muenchen",
        name: "Pernille Holm",
        email: "pernille@example.com",
        roles: ["pilot"],
      }),
    ).resolves.toEqual({ ok: true });
    expect(invalidated).toHaveBeenCalledWith({ userIds: ["invitee"] });
  });

  it("an admin adding a passenger on someone's behalf", async () => {
    (provisionAssistedPassenger as jest.Mock).mockResolvedValue({
      userId: "user-inge",
      outcome: "created",
    });
    await expect(
      addAssistedPassenger({
        chapterId: "chapter-muenchen",
        firstName: "Inge",
        lastName: "Holm",
        birthDate: "1939-07-30",
        gender: "female",
        contact: "inge@example.com",
      }),
    ).resolves.toEqual({ ok: true, outcome: "created" });
    expect(invalidated).toHaveBeenCalledWith({ userIds: ["user-inge"] });
  });

  it("deleting one's own account", async () => {
    await expect(deleteOwnAccountAction()).resolves.toEqual({ ok: true });
    expect(invalidated).toHaveBeenCalledWith({ userIds: ["viewer"] });
    expect(expirePasskeys).toHaveBeenCalledWith("viewer");
  });

  it("joining a chapter as a passenger", async () => {
    await joinChapterAsPassenger("chapter-muenchen");
    expect(invalidated).toHaveBeenCalledWith({ userIds: ["viewer"] });
  });

  it("accepting a care request, which joins the caretaker", async () => {
    await expect(acceptCareRequestAction("request-1")).resolves.toEqual({
      ok: true,
    });
    expect(invalidated).toHaveBeenCalledWith({ userIds: ["viewer"] });
  });

  it("settling a passenger or caretaker into a chapter", async () => {
    await settlePassengerAt({
      residence: "careHome",
      chapterId: "chapter-muenchen",
    });
    await settleCaretakerAt("chapter-muenchen");
    expect(invalidated).toHaveBeenNthCalledWith(1, { userIds: ["viewer"] });
    expect(invalidated).toHaveBeenNthCalledWith(2, { userIds: ["viewer"] });
  });
});

describe("chapter and country writes refresh the admin scope lists", () => {
  it("creating and renaming a country", async () => {
    await createCountryAction(passthrough as never);
    await updateCountryAction("country-dk", {} as never);
    expect(invalidateAdminScopes).toHaveBeenCalledTimes(2);
  });

  it("creating and renaming a chapter", async () => {
    (createChapter as jest.Mock).mockResolvedValue({
      id: "chapter-new",
      slug: "new",
      name: "New",
    });
    await createChapterAction({ countryId: "country-de" } as never);
    await updateChapterAction("chapter-new", {} as never);
    expect(invalidateAdminScopes).toHaveBeenCalledTimes(2);
    expect(chapters.createCountry).not.toHaveBeenCalled();
  });
});
