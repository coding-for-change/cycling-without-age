import { requireChapterAdmin } from "@/lib/auth-guards";
import { DomainError } from "@/lib/domain-error";
import { provisionAssistedPassenger } from "@/use-cases/provision-assisted-passenger";
import { addAssistedPassenger } from "./actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/cache-tags", () => ({ invalidateReports: jest.fn() }));
jest.mock("@/lib/auth-guards", () => ({
  requireAuth: jest.fn(),
  requireChapterAdmin: jest.fn(),
}));
jest.mock("@/lib/access", () => ({ canDeleteOwnAccount: jest.fn() }));
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
