import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { bookRider } from "@/use-cases/book-rider";

jest.mock("@/features/passengers", () => ({
  passengers: { getPassenger: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { bookRider: jest.fn() },
}));

const getPassenger = passengers.getPassenger as jest.Mock;

const RIDE = {
  id: "ride-1",
  chapterId: "chapter-muenchen",
  trishawIds: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

it("books a rider of the ride's own chapter", async () => {
  getPassenger.mockResolvedValue({ id: "p-1", chapterId: "chapter-muenchen" });
  await bookRider(RIDE, "p-1", "user-admin");
  expect(rides.bookRider).toHaveBeenCalledWith(
    "ride-1",
    "p-1",
    "user-admin",
    undefined,
  );
});

it("refuses a rider of another chapter", async () => {
  getPassenger.mockResolvedValue({ id: "p-1", chapterId: "chapter-hamburg" });
  await expect(bookRider(RIDE, "p-1", "user-admin")).rejects.toThrow(
    "riderNotInChapter",
  );
  expect(rides.bookRider).not.toHaveBeenCalled();
});

it("refuses a rider who is not there", async () => {
  getPassenger.mockResolvedValue(null);
  await expect(bookRider(RIDE, "p-1", "user-admin")).rejects.toThrow(
    "unknownPassenger",
  );
});
