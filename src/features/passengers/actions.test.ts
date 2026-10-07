import { revalidatePath } from "next/cache";
import { DomainError } from "@/lib/domain-error";
import {
  removeManagedRider,
  updateManagedRider,
} from "@/use-cases/manage-rider";
import { removeManagedRiderAction, updateManagedRiderAction } from "./actions";

const session = {
  user: { id: "daughter-lena" },
  access: { role: null, countryAdminOf: [], memberships: [] },
};

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth-guards", () => ({
  requireAuth: jest.fn(async () => session),
}));
jest.mock("@/lib/cache-tags", () => ({ invalidateReports: jest.fn() }));
jest.mock("@/use-cases/add-managed-rider", () => ({
  addManagedRider: jest.fn(),
}));
jest.mock("@/use-cases/manage-rider", () => ({
  updateManagedRider: jest.fn(),
  removeManagedRider: jest.fn(),
}));

const update = updateManagedRider as jest.Mock;
const remove = removeManagedRider as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  update.mockResolvedValue({ chapterId: "chapter-muenchen" });
  remove.mockResolvedValue({ chapterId: "chapter-muenchen" });
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
