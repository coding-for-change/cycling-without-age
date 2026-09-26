import { fleet } from "@/features/fleet";
import { rides } from "@/features/rides";
import { allocateTrishaws } from "@/use-cases/schedule-ride";

jest.mock("@/features/fleet", () => ({ fleet: { assertUsable: jest.fn() } }));
jest.mock("@/features/rides", () => ({
  rides: { getRide: jest.fn(), setRideTrishaws: jest.fn() },
}));

const assertUsable = fleet.assertUsable as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (rides.getRide as jest.Mock).mockResolvedValue({
    id: "ride-1",
    chapterId: "chapter-muenchen",
    trishaws: [{ trishaw: { id: "grounded-since" } }],
  });
});

it("checks only newly added trishaws, so a grounded one already on the ride can stay", async () => {
  await allocateTrishaws("ride-1", ["grounded-since", "new-one"]);
  expect(assertUsable).toHaveBeenCalledWith(["new-one"], "chapter-muenchen");
  expect(rides.setRideTrishaws).toHaveBeenCalledWith("ride-1", [
    "grounded-since",
    "new-one",
  ]);
});

it("stops before writing when a new trishaw is unusable", async () => {
  assertUsable.mockRejectedValue(new Error("trishawUnavailable"));
  await expect(allocateTrishaws("ride-1", ["new-one"])).rejects.toThrow();
  expect(rides.setRideTrishaws).not.toHaveBeenCalled();
});
