import { prisma } from "@/lib/prisma";
import { admins } from "@/features/admins";
import {
  hasSuperadminRole,
  withoutSuperadmin,
  withSuperadmin,
} from "@/features/admins/roles";

jest.mock("@/lib/prisma", () => {
  const client: Record<string, unknown> = {
    adminInvite: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    user: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    event: { create: jest.fn(async () => ({ id: "event-1" })) },
    $queryRaw: jest.fn(),
  };
  client.$transaction = jest.fn((run: (tx: unknown) => unknown) => run(client));
  return { prisma: client };
});
jest.mock("@/lib/events/queues", () => ({
  QUEUE: { events: "events" },
  queue: () => ({ add: jest.fn(async () => ({})) }),
}));

const db = prisma as unknown as {
  adminInvite: {
    create: jest.Mock;
    updateMany: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
  };
  user: { findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock };
  event: { create: jest.Mock };
  $queryRaw: jest.Mock;
};

const INVITE = "0b9f6a0e-6f7a-4c43-9a51-1f2c3d4e5f60";
const ANKE = "user-anke";
const BO = "user-bo";
const DAY = 24 * 60 * 60 * 1000;

const invite = (overrides: Record<string, unknown> = {}) => ({
  id: INVITE,
  kind: "superadmin",
  countryId: null,
  userId: BO,
  invitedByUserId: ANKE,
  createdAt: new Date(Date.now() - DAY),
  expiresAt: new Date(Date.now() + 6 * DAY),
  acceptedAt: null,
  revokedAt: null,
  user: { name: "Bo", email: "bo@example.com" },
  invitedBy: { name: "Anke" },
  country: null,
  ...overrides,
});

const emittedTypes = () =>
  db.event.create.mock.calls.map(([arg]) => arg.data.type);

beforeEach(() => {
  jest.clearAllMocks();
  db.adminInvite.create.mockResolvedValue({ id: INVITE });
  db.adminInvite.updateMany.mockResolvedValue({ count: 1 });
  db.user.findUnique.mockResolvedValue({ role: "user" });
});

describe("superadmin role strings", () => {
  it("adds the role without keeping the base user role", () => {
    expect(withSuperadmin("user")).toBe("superadmin");
    expect(withSuperadmin(null)).toBe("superadmin");
    expect(withSuperadmin("superadmin")).toBe("superadmin");
  });

  it("falls back to the base role when nothing else is left", () => {
    expect(withoutSuperadmin("superadmin")).toBe("user");
    expect(withoutSuperadmin("superadmin,tester")).toBe("tester");
  });

  it("matches the role exactly, not as a substring", () => {
    expect(hasSuperadminRole("superadmin")).toBe(true);
    expect(hasSuperadminRole("notsuperadmin")).toBe(false);
    expect(hasSuperadminRole(null)).toBe(false);
  });
});

describe("invite status", () => {
  it("is pending until it expires, is accepted or is revoked", () => {
    expect(admins.inviteStatusOf(invite())).toBe("pending");
    expect(
      admins.inviteStatusOf(invite({ expiresAt: new Date(Date.now() - 1) })),
    ).toBe("expired");
    expect(admins.inviteStatusOf(invite({ revokedAt: new Date() }))).toBe(
      "revoked",
    );
    expect(admins.inviteStatusOf(invite({ acceptedAt: new Date() }))).toBe(
      "accepted",
    );
  });

  it("runs out after seven days", () => {
    const from = new Date("2026-10-22T10:00:00Z");
    expect(admins.inviteExpiry(from).toISOString()).toBe(
      "2026-10-29T10:00:00.000Z",
    );
  });
});

describe("creating an invite", () => {
  it("withdraws an earlier open invite for the same role and announces the new one", async () => {
    await expect(
      admins.createInvite({
        kind: "superadmin",
        userId: BO,
        actorUserId: ANKE,
      }),
    ).resolves.toEqual({ inviteId: INVITE });

    expect(db.adminInvite.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          kind: "superadmin",
          userId: BO,
          countryId: null,
          acceptedAt: null,
          revokedAt: null,
        }),
      }),
    );
    const created = db.adminInvite.create.mock.calls[0][0].data;
    expect(created).toMatchObject({
      kind: "superadmin",
      userId: BO,
      invitedByUserId: ANKE,
      countryId: null,
    });
    expect(created.expiresAt.getTime() - Date.now()).toBeGreaterThan(
      7 * DAY - 5000,
    );
    expect(emittedTypes()).toEqual(["adminInvite.created"]);
  });

  it("refuses someone who is a superadmin already", async () => {
    db.user.findUnique.mockResolvedValue({ role: "superadmin" });
    await expect(
      admins.createInvite({
        kind: "superadmin",
        userId: BO,
        actorUserId: ANKE,
      }),
    ).rejects.toMatchObject({ code: "alreadyAdmin" });
    expect(db.adminInvite.create).not.toHaveBeenCalled();
  });

  it("binds a country admin invite to its country", async () => {
    await admins.createInvite({
      kind: "countryAdmin",
      countryId: "country-de",
      userId: BO,
      actorUserId: ANKE,
    });
    expect(db.adminInvite.create.mock.calls[0][0].data.countryId).toBe(
      "country-de",
    );
  });
});

describe("accepting a superadmin invite", () => {
  it("grants the role only to the invited person", async () => {
    db.adminInvite.findUnique.mockResolvedValue(invite());
    await expect(
      admins.acceptSuperadminInvite(INVITE, ANKE),
    ).rejects.toMatchObject({ code: "notFound" });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("grants the role and announces it", async () => {
    db.adminInvite.findUnique.mockResolvedValue(invite());
    await admins.acceptSuperadminInvite(INVITE, BO);
    expect(db.adminInvite.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: INVITE,
          userId: BO,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        }),
      }),
    );
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: BO },
      data: { role: "superadmin" },
    });
    expect(emittedTypes()).toEqual(["superadmin.granted"]);
  });

  it("refuses an expired invite without granting anything", async () => {
    db.adminInvite.findUnique.mockResolvedValue(
      invite({ expiresAt: new Date(Date.now() - 1) }),
    );
    db.adminInvite.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      admins.acceptSuperadminInvite(INVITE, BO),
    ).rejects.toMatchObject({ code: "inviteExpired" });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("refuses a revoked invite without granting anything", async () => {
    db.adminInvite.findUnique.mockResolvedValue(
      invite({ revokedAt: new Date() }),
    );
    db.adminInvite.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      admins.acceptSuperadminInvite(INVITE, BO),
    ).rejects.toMatchObject({ code: "inviteClosed" });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("does not turn a country admin invite into a superadmin", async () => {
    db.adminInvite.findUnique.mockResolvedValue(
      invite({ kind: "countryAdmin", countryId: "country-de" }),
    );
    await expect(
      admins.acceptSuperadminInvite(INVITE, BO),
    ).rejects.toMatchObject({ code: "notFound" });
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe("revoking an invite", () => {
  it("only touches an open invite of the given kind", async () => {
    await admins.revokeInvite(INVITE, "superadmin");
    expect(db.adminInvite.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: INVITE,
          kind: "superadmin",
          acceptedAt: null,
          revokedAt: null,
        },
      }),
    );
  });

  it("reports an invite that was already used or withdrawn", async () => {
    db.adminInvite.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      admins.revokeInvite(INVITE, "superadmin"),
    ).rejects.toMatchObject({ code: "inviteClosed" });
  });
});

describe("removing a superadmin", () => {
  it("never removes the last superadmin, not even oneself", async () => {
    db.$queryRaw.mockResolvedValue([{ id: ANKE, role: "superadmin" }]);
    await expect(admins.removeSuperadmin(ANKE, ANKE)).rejects.toMatchObject({
      code: "lastSuperadmin",
    });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("does not count a lookalike role as a second superadmin", async () => {
    db.$queryRaw.mockResolvedValue([
      { id: ANKE, role: "superadmin" },
      { id: BO, role: "notsuperadmin" },
    ]);
    await expect(admins.removeSuperadmin(ANKE, ANKE)).rejects.toMatchObject({
      code: "lastSuperadmin",
    });
  });

  it("lets oneself step down while another superadmin remains", async () => {
    db.$queryRaw.mockResolvedValue([
      { id: ANKE, role: "superadmin" },
      { id: BO, role: "superadmin" },
    ]);
    await admins.removeSuperadmin(ANKE, ANKE);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: ANKE },
      data: { role: "user" },
    });
  });

  it("removes the role, withdraws their open invites and announces it", async () => {
    db.$queryRaw.mockResolvedValue([
      { id: ANKE, role: "superadmin" },
      { id: BO, role: "superadmin" },
    ]);
    await admins.removeSuperadmin(BO, ANKE);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: BO },
      data: { role: "user" },
    });
    expect(db.adminInvite.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { invitedByUserId: BO, acceptedAt: null, revokedAt: null },
      }),
    );
    expect(emittedTypes()).toEqual(["superadmin.removed"]);
  });

  it("refuses someone who is not a superadmin", async () => {
    db.$queryRaw.mockResolvedValue([
      { id: ANKE, role: "superadmin" },
      { id: BO, role: "superadmin" },
    ]);
    await expect(
      admins.removeSuperadmin("user-cara", ANKE),
    ).rejects.toMatchObject({ code: "notFound" });
  });
});
