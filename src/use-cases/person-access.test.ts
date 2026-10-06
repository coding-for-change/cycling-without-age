import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { subjectSlug } from "@/features/person-profiles";
import { profile } from "@/features/profile";
import type { Access, ChapterRole } from "@/lib/access";
import {
  accessPerson,
  canEdit,
  canGiveHealthConsent,
  canManageRider,
  canRemoveRider,
  canSetAccessibility,
  canUploadPhoto,
  seesHealthDetails,
  visiblePhotoSubjects,
} from "./person-access";

jest.mock("@/features/person-profiles", () =>
  jest.requireActual("@/features/person-profiles/schemas"),
);
jest.mock("@/features/chapters", () => ({
  chapters: { getChapterCountryId: jest.fn(), getChapterCountryIds: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: {
    listMembershipsOfUser: jest.fn(),
    listMembershipsOfUsers: jest.fn(),
  },
}));
jest.mock("@/features/passengers", () => ({
  passengers: {
    getPassenger: jest.fn(),
    getOwnPassenger: jest.fn(),
    getOwnPassengers: jest.fn(),
    listPassengersManagedBy: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfile: jest.fn(), getAccessAccounts: jest.fn() },
}));

const MUENCHEN = "chapter-muenchen";
const BERLIN = "chapter-berlin";
const GERMANY = "country-de";

const memberships = new Map<
  string,
  { chapterId: string; roles: ChapterRole[] }[]
>();
const accounts = new Map<string, object>();
const ownRiders = new Map<string, object>();
const riders = new Map<string, object>();
const managed = new Map<string, object[]>();

const viewer = (
  id: string,
  roles: { chapterId: string; roles: ChapterRole[] }[] = [],
  extra: Partial<Access> = {},
) => ({
  user: { id },
  access: { role: null, countryAdminOf: [], memberships: roles, ...extra },
});

const account = (id: string, extra: object = {}) =>
  accounts.set(id, {
    name: id,
    email: `${id}@example.org`,
    birthDate: new Date("1940-05-01"),
    createdByUserId: null,
    claimedAt: null,
    ...extra,
  });

beforeEach(() => {
  jest.clearAllMocks();
  memberships.clear();
  accounts.clear();
  ownRiders.clear();
  riders.clear();
  managed.clear();

  (chapters.getChapterCountryId as jest.Mock).mockResolvedValue(GERMANY);
  (chapters.getChapterCountryIds as jest.Mock).mockImplementation(
    async (ids: string[]) => new Map(ids.map((id) => [id, GERMANY])),
  );
  (membership.listMembershipsOfUsers as jest.Mock).mockImplementation(
    async (ids: string[]) =>
      new Map(
        ids.flatMap((id) => {
          const found = memberships.get(id);
          return found ? [[id, found] as const] : [];
        }),
      ),
  );
  (profile.getAccessAccounts as jest.Mock).mockImplementation(
    async (ids: string[]) =>
      ids.flatMap((id) => {
        const found = accounts.get(id);
        return found ? [{ id, ...found }] : [];
      }),
  );
  (passengers.getOwnPassengers as jest.Mock).mockImplementation(
    async (ids: string[]) =>
      ids.flatMap((id) => {
        const found = ownRiders.get(id);
        return found ? [{ userId: id, ...found }] : [];
      }),
  );
  (membership.listMembershipsOfUser as jest.Mock).mockImplementation(
    async (id: string) => memberships.get(id) ?? [],
  );
  (profile.getProfile as jest.Mock).mockImplementation(
    async (id: string) => accounts.get(id) ?? null,
  );
  (passengers.getOwnPassenger as jest.Mock).mockImplementation(
    async (id: string) => ownRiders.get(id) ?? null,
  );
  (passengers.getPassenger as jest.Mock).mockImplementation(
    async (id: string) => riders.get(id) ?? null,
  );
  (passengers.listPassengersManagedBy as jest.Mock).mockImplementation(
    async (id: string) => managed.get(id) ?? [],
  );

  account("pilot-anna");
  memberships.set("pilot-anna", [{ chapterId: MUENCHEN, roles: ["pilot"] }]);

  account("rider-karl");
  memberships.set("rider-karl", [
    { chapterId: MUENCHEN, roles: ["passenger"] },
  ]);
  ownRiders.set("rider-karl", {
    id: "p-karl",
    chapterId: MUENCHEN,
    managedByUserId: "rider-karl",
  });

  riders.set("managed-greta", {
    id: "managed-greta",
    chapterId: MUENCHEN,
    managedByUserId: "daughter-lena",
    userId: null,
    firstName: "Greta",
    lastName: "Holm",
    birthDate: new Date("1938-02-11"),
  });
});

const greta = { kind: "passenger" as const, id: "managed-greta" };
const anna = { kind: "user" as const, id: "pilot-anna" };
const karl = { kind: "user" as const, id: "rider-karl" };

describe("who sees a profile", () => {
  it("lets a pilot see every rider of their chapter", async () => {
    const found = await accessPerson(
      viewer("pilot-anna", [{ chapterId: MUENCHEN, roles: ["pilot"] }]),
      greta,
    );
    expect(found?.relation).toBe("peer");
  });

  it("hides riders from a pilot of another chapter", async () => {
    expect(
      await accessPerson(
        viewer("pilot-ben", [{ chapterId: BERLIN, roles: ["pilot"] }]),
        greta,
      ),
    ).toBeNull();
  });

  it("never shows one rider to another", async () => {
    expect(
      await accessPerson(
        viewer("rider-karl", [{ chapterId: MUENCHEN, roles: ["passenger"] }]),
        greta,
      ),
    ).toBeNull();
  });

  it("lets a rider see the pilots of their chapter", async () => {
    const found = await accessPerson(
      viewer("rider-karl", [{ chapterId: MUENCHEN, roles: ["passenger"] }]),
      anna,
    );
    expect(found?.relation).toBe("peer");
  });

  it("lets a manager without a membership see the pilots of their rider's chapter", async () => {
    managed.set("daughter-lena", [
      { id: "managed-greta", chapterId: MUENCHEN },
    ]);
    const found = await accessPerson(viewer("daughter-lena"), anna);
    expect(found?.relation).toBe("peer");
  });

  it("gives a pending applicant no view of the chapter", async () => {
    expect(await accessPerson(viewer("applicant-mia"), greta)).toBeNull();
  });

  it("lets a country admin see riders in their country", async () => {
    const found = await accessPerson(
      viewer("admin-eva", [], { countryAdminOf: [GERMANY] }),
      karl,
    );
    expect(found?.relation).toBe("admin");
  });

  it("treats the rider's manager as the editor", async () => {
    const found = await accessPerson(viewer("daughter-lena"), greta);
    expect(found?.relation).toBe("manager");
    expect(canEdit(found!.relation)).toBe(true);
    expect(canUploadPhoto(found!.relation)).toBe(true);
    expect(canGiveHealthConsent(found!.relation, found!.target)).toBe(true);
  });

  it("addresses a rider with an account as that account", async () => {
    riders.set("p-karl", {
      id: "p-karl",
      chapterId: MUENCHEN,
      managedByUserId: "rider-karl",
      userId: "rider-karl",
    });
    const found = await accessPerson(viewer("rider-karl"), {
      kind: "passenger",
      id: "p-karl",
    });
    expect(found?.relation).toBe("self");
    expect(found?.target.subject).toEqual(karl);
  });
});

describe("who edits a profile", () => {
  it("lets an admin only read and remove a managed rider, never edit it", async () => {
    const found = await accessPerson(
      viewer("admin-eva", [{ chapterId: MUENCHEN, roles: ["admin"] }]),
      greta,
    );
    expect(found?.relation).toBe("admin");
    expect(canEdit(found!.relation)).toBe(false);
    expect(canManageRider(found!.relation, found!.target)).toBe(false);
    expect(canRemoveRider(found!.relation, found!.target)).toBe(true);
    expect(canUploadPhoto(found!.relation)).toBe(false);
    expect(canGiveHealthConsent(found!.relation, found!.target)).toBe(false);
  });

  it("keeps admins out of a self-managed account", async () => {
    const found = await accessPerson(
      viewer("admin-eva", [{ chapterId: MUENCHEN, roles: ["admin"] }]),
      karl,
    );
    expect(canEdit(found!.relation)).toBe(false);
  });

  it("hands a provisioned account back once its owner claims it", async () => {
    account("resident-otto", {
      createdByUserId: "admin-eva",
      claimedAt: new Date(),
    });
    ownRiders.set("resident-otto", {
      id: "p-otto",
      chapterId: MUENCHEN,
      managedByUserId: "son-jonas",
    });
    const found = await accessPerson(viewer("son-jonas"), {
      kind: "user",
      id: "resident-otto",
    });
    expect(found?.relation).toBe("peer");
    expect(canEdit(found!.relation)).toBe(false);
  });

  it("lets an admin who helped set up an account administer it once it is claimed", async () => {
    account("resident-otto", {
      createdByUserId: "admin-eva",
      claimedAt: new Date(),
    });
    ownRiders.set("resident-otto", {
      id: "p-otto",
      chapterId: MUENCHEN,
      managedByUserId: "admin-eva",
    });
    const found = await accessPerson(
      viewer("admin-eva", [{ chapterId: MUENCHEN, roles: ["admin"] }]),
      { kind: "user", id: "resident-otto" },
    );
    expect(found?.relation).toBe("admin");
    expect(canEdit(found!.relation)).toBe(false);
  });

  it("keeps the helper the manager while the account is unclaimed, even as admin", async () => {
    account("resident-otto", { createdByUserId: "admin-eva" });
    ownRiders.set("resident-otto", {
      id: "p-otto",
      chapterId: MUENCHEN,
      managedByUserId: "admin-eva",
    });
    const found = await accessPerson(
      viewer("admin-eva", [{ chapterId: MUENCHEN, roles: ["admin"] }]),
      { kind: "user", id: "resident-otto" },
    );
    expect(found?.relation).toBe("manager");
  });

  it("shows health details to the chapter's pilots but not to riders", async () => {
    ownRiders.set("pilot-anna", {
      id: "p-anna",
      chapterId: MUENCHEN,
      managedByUserId: "pilot-anna",
    });
    const rider = viewer("rider-karl", [
      { chapterId: MUENCHEN, roles: ["passenger"] },
    ]);
    const byRider = await accessPerson(rider, anna);
    expect(seesHealthDetails(rider, byRider!.relation, byRider!.target)).toBe(
      false,
    );

    const pilot = viewer("pilot-ben", [
      { chapterId: MUENCHEN, roles: ["pilot"] },
    ]);
    const byPilot = await accessPerson(pilot, greta);
    expect(seesHealthDetails(pilot, byPilot!.relation, byPilot!.target)).toBe(
      true,
    );
  });

  it("keeps health details to the chapter the person rides in", async () => {
    memberships.set("rider-karl", [
      { chapterId: MUENCHEN, roles: ["passenger"] },
      { chapterId: BERLIN, roles: ["pilot"] },
    ]);
    const berlinPilot = viewer("pilot-ben", [
      { chapterId: BERLIN, roles: ["pilot"] },
    ]);
    const found = await accessPerson(berlinPilot, karl);
    expect(found?.relation).toBe("peer");
    expect(seesHealthDetails(berlinPilot, found!.relation, found!.target)).toBe(
      false,
    );
  });

  it("keeps accessibility to people who ride", async () => {
    const found = await accessPerson(viewer("pilot-anna"), anna);
    expect(found?.relation).toBe("self");
    expect(canSetAccessibility(found!.relation, found!.target)).toBe(false);
  });
});

describe("who manages a rider's record", () => {
  const manages = async (who: ReturnType<typeof viewer>, ref = greta) => {
    const found = await accessPerson(who, ref);
    return found ? canManageRider(found.relation, found.target) : false;
  };

  it("lets only the rider's manager edit them, and their chapter's admin remove them", async () => {
    const admin = viewer("admin-eva", [
      { chapterId: MUENCHEN, roles: ["admin"] },
    ]);
    expect(await manages(viewer("daughter-lena"))).toBe(true);
    expect(await manages(admin)).toBe(false);

    const found = await accessPerson(admin, greta);
    expect(canRemoveRider(found!.relation, found!.target)).toBe(true);
  });

  it("refuses anyone else who can see the rider", async () => {
    expect(
      await manages(
        viewer("pilot-anna", [{ chapterId: MUENCHEN, roles: ["pilot"] }]),
      ),
    ).toBe(false);
    expect(
      await manages(
        viewer("rider-karl", [{ chapterId: MUENCHEN, roles: ["passenger"] }]),
      ),
    ).toBe(false);
  });

  it("refuses an admin of another chapter", async () => {
    expect(
      await manages(
        viewer("admin-ben", [{ chapterId: BERLIN, roles: ["admin"] }]),
      ),
    ).toBe(false);
  });

  it("never manages a rider who has their own account", async () => {
    account("resident-otto", { createdByUserId: "son-jonas" });
    ownRiders.set("resident-otto", {
      id: "p-otto",
      chapterId: MUENCHEN,
      managedByUserId: "son-jonas",
    });
    riders.set("p-otto", {
      id: "p-otto",
      chapterId: MUENCHEN,
      managedByUserId: "son-jonas",
      userId: "resident-otto",
    });
    const otto = { kind: "passenger" as const, id: "p-otto" };

    const found = await accessPerson(viewer("son-jonas"), otto);
    expect(found?.relation).toBe("manager");
    expect(canManageRider(found!.relation, found!.target)).toBe(false);
    expect(
      await manages(
        viewer("admin-eva", [{ chapterId: MUENCHEN, roles: ["admin"] }]),
        otto,
      ),
    ).toBe(false);
  });
});

describe("whose photos a viewer sees in bulk", () => {
  const people = () => {
    account("pilot-ben");
    memberships.set("pilot-ben", [{ chapterId: BERLIN, roles: ["pilot"] }]);
    account("resident-otto", {
      createdByUserId: "son-jonas",
      claimedAt: new Date(),
    });
    ownRiders.set("resident-otto", {
      id: "p-otto",
      chapterId: MUENCHEN,
      managedByUserId: "son-jonas",
    });
    return [
      "pilot-anna",
      "rider-karl",
      "pilot-ben",
      "resident-otto",
      "ghost",
    ].map((id) => ({ kind: "user" as const, id }));
  };

  const viewers = () => [
    viewer("rider-karl", [{ chapterId: MUENCHEN, roles: ["passenger"] }]),
    viewer("pilot-anna", [{ chapterId: MUENCHEN, roles: ["pilot"] }]),
    viewer("admin-eva", [{ chapterId: BERLIN, roles: ["admin"] }]),
    viewer("son-jonas"),
    viewer("daughter-lena"),
  ];

  it("agrees with resolving each person on their own", async () => {
    const refs = people();
    managed.set("daughter-lena", [
      { id: "managed-greta", chapterId: MUENCHEN },
    ]);
    for (const who of viewers()) {
      const one = new Set<string>();
      for (const ref of refs)
        if (await accessPerson(who, ref)) one.add(subjectSlug(ref));
      const bulk = await visiblePhotoSubjects(who, refs);
      expect([...bulk].sort()).toEqual([...one].sort());
    }
  });

  it("reads everyone in one go", async () => {
    await visiblePhotoSubjects(viewers()[0], people());
    expect(profile.getAccessAccounts).toHaveBeenCalledTimes(1);
    expect(membership.listMembershipsOfUsers).toHaveBeenCalledTimes(1);
    expect(passengers.getOwnPassengers).toHaveBeenCalledTimes(1);
    expect(chapters.getChapterCountryIds).toHaveBeenCalledTimes(1);
    expect(profile.getProfile).not.toHaveBeenCalled();
    expect(membership.listMembershipsOfUser).not.toHaveBeenCalled();
  });
});
