import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { domainCode } from "@/lib/domain-error";
import { bookEventSeats } from "./book-event-seat";

jest.mock("@/features/passengers", () => ({
  passengers: { listPassengersManagedBy: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { getRideScope: jest.fn(), bookSeats: jest.fn() },
}));

const codeOf = (run: Promise<unknown>) =>
  run.then(
    () => null,
    (error) => domainCode(error),
  );

beforeEach(() => {
  jest.clearAllMocks();
  (rides.getRideScope as jest.Mock).mockResolvedValue({
    id: "ride-1",
    chapterId: "chapter-1",
    trishawIds: [],
  });
  (passengers.listPassengersManagedBy as jest.Mock).mockResolvedValue([
    { id: "mother", chapterId: "chapter-1" },
    { id: "uncle", chapterId: "chapter-2" },
  ]);
  (rides.bookSeats as jest.Mock).mockResolvedValue(1);
});

describe("bookEventSeats", () => {
  it("books riders this account manages in the event's chapter", async () => {
    expect(await bookEventSeats("ride-1", ["mother"], "carer")).toBe(1);
    expect(rides.bookSeats).toHaveBeenCalledWith("ride-1", ["mother"], "carer");
  });

  it("refuses a rider someone else manages", async () => {
    expect(await codeOf(bookEventSeats("ride-1", ["stranger"], "carer"))).toBe(
      "unknownPassenger",
    );
    expect(rides.bookSeats).not.toHaveBeenCalled();
  });

  it("refuses a rider of another chapter", async () => {
    expect(
      await codeOf(bookEventSeats("ride-1", ["mother", "uncle"], "carer")),
    ).toBe("riderNotInChapter");
    expect(rides.bookSeats).not.toHaveBeenCalled();
  });
});
