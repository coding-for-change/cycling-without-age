import { revalidatePath } from "next/cache";
import { requireChapterAdmin } from "@/lib/auth-guards";
import { DomainError } from "@/lib/domain-error";
import { handOverRider } from "@/use-cases/hand-over-rider";
import {
  removeManagedRider,
  updateManagedRider,
} from "@/use-cases/manage-rider";
import {
  handOverRiderAction,
  removeManagedRiderAction,
  updateManagedRiderAction,
} from "./actions";
import { passengers } from "./index";

const session = {
  user: { id: "daughter-lena" },
  access: { role: null, countryAdminOf: [], memberships: [] },
};

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth-guards", () => ({
  requireAuth: jest.fn(async () => session),
  requireAdminScope: jest.fn(),
  requireChapterAdmin: jest.fn(),
}));
jest.mock("@/lib/cache-tags", () => ({
  invalidateReports: jest.fn(),
  invalidateAccess: jest.fn(),
}));
jest.mock("@/use-cases/add-managed-rider", () => ({
  addManagedRider: jest.fn(),
}));
jest.mock("@/use-cases/hand-over-rider", () => ({
  handOverRider: jest.fn(),
}));
jest.mock("@/use-cases/manage-rider", () => ({
  updateManagedRider: jest.fn(),
  removeManagedRider: jest.fn(),
}));
jest.mock("./index", () => ({ passengers: { getPassenger: jest.fn() } }));

const update = updateManagedRider as jest.Mock;
const remove = removeManagedRider as jest.Mock;
const handOver = handOverRider as jest.Mock;
const getPassenger = passengers.getPassenger as jest.Mock;
const chapterAdmin = requireChapterAdmin as jest.Mock;

const toMember = { kind: "member", userId: "son-jens" } as const;

beforeEach(() => {
  jest.clearAllMocks();
  update.mockResolvedValue({ chapterId: "chapter-muenchen" });
  remove.mockResolvedValue({ chapterId: "chapter-muenchen" });
  getPassenger.mockResolvedValue({
    id: "managed-greta",
    userId: null,
    chapterId: "chapter-hh",
  });
  chapterAdmin.mockResolvedValue({ user: { id: "admin-hh" } });
  handOver.mockResolvedValue({
    chapterId: "chapter-hh",
    fromUserId: "daughter-lena",
    toUserId: "son-jens",
    invited: false,
  });
});

describe("updateManagedRiderAction", () => {
  it("checks access as the signed-in viewer and refreshes both views", async () => {
    await expect(
      updateManagedRiderAction("managed-greta", { gender: "female" }),
    ).resolves.toEqual({ ok: true });

    expect(update).toHaveBeenCalledWith({
      viewer: session,
      passengerId: "managed-greta",
      patch: { gender: "female" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/passenger", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/passengers", "layout");
  });

  it("rejects a patch that tries to move the rider or attach an account", async () => {
    await expect(
      updateManagedRiderAction("managed-greta", { chapterId: "elsewhere" }),
    ).resolves.toEqual({ ok: false, error: "invalid" });
    expect(update).not.toHaveBeenCalled();
  });

  it("answers a refused viewer with a generic failure", async () => {
    update.mockRejectedValue(new DomainError("unknownPassenger"));

    await expect(
      updateManagedRiderAction("managed-greta", { lastName: "Holm" }),
    ).resolves.toEqual({ ok: false, error: "generic" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("removeManagedRiderAction", () => {
  it("removes through the use case and refreshes", async () => {
    await expect(removeManagedRiderAction("managed-greta")).resolves.toEqual({
      ok: true,
    });
    expect(remove).toHaveBeenCalledWith({
      viewer: session,
      passengerId: "managed-greta",
    });
  });

  it("refuses a missing id", async () => {
    await expect(removeManagedRiderAction("")).resolves.toEqual({
      ok: false,
      error: "invalid",
    });
    expect(remove).not.toHaveBeenCalled();
  });
});

describe("handOverRiderAction", () => {
  it("authorises by the rider's own chapter", async () => {
    await expect(
      handOverRiderAction({
        passengerId: "managed-greta",
        chapterId: "chapter-muenchen",
        target: toMember,
      }),
    ).resolves.toEqual({ ok: true, invited: false });

    expect(chapterAdmin).toHaveBeenCalledTimes(1);
    expect(chapterAdmin).toHaveBeenCalledWith("chapter-hh");
    expect(handOver).toHaveBeenCalledWith({
      passengerId: "managed-greta",
      target: toMember,
      actorUserId: "admin-hh",
    });
  });

  it("refuses a rider with an account of their own", async () => {
    getPassenger.mockResolvedValue({
      id: "managed-greta",
      userId: "greta",
      chapterId: "chapter-hh",
    });

    await expect(
      handOverRiderAction({ passengerId: "managed-greta", target: toMember }),
    ).resolves.toEqual({ ok: false, error: "unknownPassenger" });
    expect(chapterAdmin).not.toHaveBeenCalled();
    expect(handOver).not.toHaveBeenCalled();
  });

  it("answers sameManager when the rider already belongs to that account", async () => {
    handOver.mockRejectedValue(new DomainError("sameManager"));

    await expect(
      handOverRiderAction({ passengerId: "managed-greta", target: toMember }),
    ).resolves.toEqual({ ok: false, error: "sameManager" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("allows twenty hand-overs an hour and refuses the twenty-first", async () => {
    chapterAdmin.mockResolvedValue({ user: { id: "admin-busy" } });

    for (let i = 0; i < 20; i++) {
      await expect(
        handOverRiderAction({ passengerId: "managed-greta", target: toMember }),
      ).resolves.toEqual({ ok: true, invited: false });
    }

    await expect(
      handOverRiderAction({ passengerId: "managed-greta", target: toMember }),
    ).resolves.toEqual({ ok: false, error: "rateLimited" });
    expect(handOver).toHaveBeenCalledTimes(20);
  });
});
