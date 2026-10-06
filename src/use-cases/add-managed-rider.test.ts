import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { addManagedRider } from "@/use-cases/add-managed-rider";

jest.mock("@/features/membership", () => ({
  membership: { listMembershipsOfUser: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: {
    listPassengersManagedBy: jest.fn(),
    addManagedPassengers: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({
  profile: { markManagesOthers: jest.fn() },
}));

const listMemberships = membership.listMembershipsOfUser as jest.Mock;
const listManaged = passengers.listPassengersManagedBy as jest.Mock;
const addMany = passengers.addManagedPassengers as jest.Mock;
const markManagesOthers = profile.markManagesOthers as jest.Mock;

const USER = "user-mette";
const CHAPTER = "chapter-koebenhavn";
const rider = {
  firstName: "Inge",
  lastName: "Holm",
  birthDate: "1939-07-30",
  gender: "female" as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  listManaged.mockResolvedValue([]);
  listMemberships.mockResolvedValue([
    { chapterId: CHAPTER, roles: ["passenger"] },
  ]);
});

describe("addManagedRider", () => {
  it("lets a passenger start booking for someone in their own chapter", async () => {
    await addManagedRider({ userId: USER, rider });

    expect(addMany).toHaveBeenCalledWith(USER, CHAPTER, [rider]);
    expect(markManagesOthers).toHaveBeenCalledWith(USER);
  });

  it("puts the next rider in the chapter of the riders already managed", async () => {
    listManaged.mockResolvedValue([{ chapterId: CHAPTER }]);
    listMemberships.mockResolvedValue([
      { chapterId: "chapter-other", roles: ["passenger"] },
      { chapterId: CHAPTER, roles: ["passenger"] },
    ]);

    await addManagedRider({ userId: USER, rider });

    expect(addMany).toHaveBeenCalledWith(USER, CHAPTER, [rider]);
  });

  it("refuses someone who is not a passenger member of that chapter", async () => {
    listMemberships.mockResolvedValue([
      { chapterId: CHAPTER, roles: ["pilot"] },
    ]);

    await expect(
      addManagedRider({ userId: USER, rider }),
    ).rejects.toMatchObject({ code: "notChapterMember" });
    expect(addMany).not.toHaveBeenCalled();
  });
});
