import { fleet } from "@/features/fleet";
import { rides } from "@/features/rides";
import { moveTrishaw } from "@/use-cases/move-trishaw";

jest.mock("@/features/fleet", () => ({
  fleet: { chaptersLosingAccess: jest.fn(), moveTrishaw: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { countFutureRidesUsing: jest.fn() },
}));

const losing = fleet.chaptersLosingAccess as jest.Mock;
const move = fleet.moveTrishaw as jest.Mock;
const count = rides.countFutureRidesUsing as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("moveTrishaw", () => {
  it("counts only the rides of chapters that lose the trishaw", async () => {
    losing.mockResolvedValue(["chapter-augsburg", "chapter-hamburg"]);
    count.mockImplementation(async (chapterId: string) =>
      chapterId === "chapter-augsburg" ? 2 : 1,
    );
    await moveTrishaw("trishaw-7", "loc-muenchen", "user-1");
    expect(count).toHaveBeenCalledWith("chapter-augsburg", ["trishaw-7"]);
    expect(count).toHaveBeenCalledWith("chapter-hamburg", ["trishaw-7"]);
    expect(move).toHaveBeenCalledWith({
      id: "trishaw-7",
      storageLocationId: "loc-muenchen",
      actorUserId: "user-1",
      futureRideCount: 3,
    });
  });

  it("asks the calendar nothing when nobody loses the trishaw", async () => {
    losing.mockResolvedValue([]);
    await moveTrishaw("trishaw-7", "pool-sued", "user-1");
    expect(count).not.toHaveBeenCalled();
    expect(move).toHaveBeenCalledWith(
      expect.objectContaining({ futureRideCount: 0 }),
    );
  });
});
