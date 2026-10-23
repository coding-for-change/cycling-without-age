import { cookies } from "next/headers";
import { chapters } from "@/features/chapters";
import { profile } from "@/features/profile";
import { readJoinPreset } from "@/lib/join-preset";
import { resolveDestination } from "@/use-cases/onboarding-progress";
import { chooseRoleAtChapter } from "./actions";

const set = jest.fn();
jest.mock("next/headers", () => ({ cookies: jest.fn(async () => ({ set })) }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth-guards", () => ({
  requireAuth: jest.fn(async () => ({ user: { id: "user-lena" } })),
  readNextPath: jest.fn(async () => null),
}));
jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn() },
}));
jest.mock("@/features/profile", () => ({
  profile: { markManagesOthers: jest.fn() },
}));
jest.mock("@/lib/join-preset", () => ({
  ...jest.requireActual("@/lib/join-preset"),
  readJoinPreset: jest.fn(),
}));
jest.mock("@/use-cases/onboarding-progress", () => ({
  resolveDestination: jest.fn(async () => "/onboarding/consent"),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (readJoinPreset as jest.Mock).mockResolvedValue({
    chapterId: "chapter-muc",
    role: null,
  });
  (chapters.getChapter as jest.Mock).mockResolvedValue({ id: "chapter-muc" });
});

describe("chooseRoleAtChapter", () => {
  it("keeps the QR code's chapter and adds the chosen role", async () => {
    await expect(chooseRoleAtChapter("pilot")).resolves.toEqual({
      ok: true,
      next: "/onboarding/consent",
    });
    expect(set).toHaveBeenCalledWith(
      "cwa.join",
      "chapter-muc|pilot",
      expect.objectContaining({ httpOnly: true }),
    );
    expect(profile.markManagesOthers).not.toHaveBeenCalled();
    expect(resolveDestination).toHaveBeenCalledWith(
      expect.anything(),
      { chapterId: "chapter-muc", role: "pilot" },
      null,
    );
  });

  it("joins someone booking for another person as a passenger who manages others", async () => {
    await chooseRoleAtChapter("caretaker");

    expect(profile.markManagesOthers).toHaveBeenCalledWith("user-lena");
    expect(set).toHaveBeenCalledWith(
      "cwa.join",
      "chapter-muc|passenger",
      expect.anything(),
    );
  });

  it("refuses without a QR chapter, so the normal location step follows", async () => {
    (readJoinPreset as jest.Mock).mockResolvedValue({
      chapterId: null,
      role: null,
    });
    await expect(chooseRoleAtChapter("passenger")).resolves.toEqual({
      ok: false,
      error: "noChapter",
    });

    (readJoinPreset as jest.Mock).mockResolvedValue({
      chapterId: "gone",
      role: null,
    });
    (chapters.getChapter as jest.Mock).mockResolvedValue(null);
    await expect(chooseRoleAtChapter("passenger")).resolves.toEqual({
      ok: false,
      error: "noChapter",
    });
    expect(cookies).not.toHaveBeenCalled();
  });

  it("rejects a role that does not exist", async () => {
    await expect(chooseRoleAtChapter("admin")).resolves.toEqual({
      ok: false,
      error: "generic",
    });
  });
});
