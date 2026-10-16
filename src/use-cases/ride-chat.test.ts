import { chat, type RideConversationInput } from "@/features/chat";
import { membership } from "@/features/membership";
import { rides } from "@/features/rides";
import { syncRideChat, syncRiderChats } from "./ride-chat";

jest.mock("@/features/chat", () => ({
  chat: { syncRideConversation: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { listChapterAdmins: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: {
    listRideParticipants: jest.fn(),
    getRideFacts: jest.fn(),
    upcomingRideIdsOf: jest.fn(),
  },
}));

const participants = rides.listRideParticipants as jest.Mock;
const sync = chat.syncRideConversation as jest.Mock;

const loaded = async (open: boolean) => {
  await syncRideChat("ride-1");
  const [input] = sync.mock.calls[0] as [RideConversationInput];
  expect(input.rideId).toBe("ride-1");
  return input.load(open);
};

beforeEach(() => {
  jest.clearAllMocks();
  (rides.getRideFacts as jest.Mock).mockResolvedValue({
    title: null,
    model: "pleasure",
    locationName: "Sonnenhof",
  });
  (membership.listChapterAdmins as jest.Mock).mockResolvedValue([
    { userId: "admin-1" },
  ]);
  sync.mockResolvedValue("conv-1");
});

describe("syncRideChat", () => {
  it("opens the chat once a pilot is on, with the riders' side and the admins", async () => {
    participants.mockResolvedValue({
      chapterId: "chapter-1",
      pilotUserIds: ["pilot-1"],
      riderCount: 1,
      riderAccountUserIds: ["carer-1"],
    });
    expect(await loaded(false)).toEqual({
      chapterId: "chapter-1",
      title: "Sonnenhof",
      memberUserIds: ["pilot-1", "carer-1", "admin-1"],
    });
  });

  it("keeps the families who booked an event out of its chat", async () => {
    (rides.getRideFacts as jest.Mock).mockResolvedValue({
      title: "Summer fair",
      model: "event",
      locationName: "Sonnenhof",
    });
    participants.mockResolvedValue({
      chapterId: "chapter-1",
      pilotUserIds: ["pilot-1"],
      riderAccountUserIds: ["carer-1", "carer-2"],
    });
    expect(await loaded(false)).toEqual(
      expect.objectContaining({ memberUserIds: ["pilot-1", "admin-1"] }),
    );
  });

  it("takes in a family who books every rider on the ride", async () => {
    participants.mockResolvedValue({
      chapterId: "chapter-1",
      pilotUserIds: ["pilot-1"],
      riderCount: 2,
      riderAccountUserIds: ["carer-1"],
    });
    expect(await loaded(false)).toEqual(
      expect.objectContaining({
        memberUserIds: ["pilot-1", "carer-1", "admin-1"],
      }),
    );
  });

  it("takes in a rider and whoever books for them", async () => {
    participants.mockResolvedValue({
      chapterId: "chapter-1",
      pilotUserIds: ["pilot-1"],
      riderCount: 1,
      riderAccountUserIds: ["carer-1", "rider-1"],
    });
    expect(await loaded(false)).toEqual(
      expect.objectContaining({
        memberUserIds: ["pilot-1", "carer-1", "rider-1", "admin-1"],
      }),
    );
  });

  // Two households on one pleasure ride never meet in its chat.
  it("keeps riders of different households out of each other's chat", async () => {
    participants.mockResolvedValue({
      chapterId: "chapter-1",
      pilotUserIds: ["pilot-1"],
      riderCount: 2,
      riderAccountUserIds: ["carer-1", "carer-2"],
    });
    expect(await loaded(false)).toEqual(
      expect.objectContaining({ memberUserIds: ["pilot-1", "admin-1"] }),
    );
  });

  it("opens no chat for a ride nobody pilots yet", async () => {
    participants.mockResolvedValue({
      chapterId: "chapter-1",
      pilotUserIds: [],
      riderAccountUserIds: ["carer-1"],
    });
    expect(await loaded(false)).toBeNull();
  });

  it("keeps an existing chat in step when the last pilot leaves", async () => {
    participants.mockResolvedValue({
      chapterId: "chapter-1",
      pilotUserIds: [],
      riderAccountUserIds: ["carer-1"],
    });
    expect(await loaded(true)).toEqual(
      expect.objectContaining({ memberUserIds: ["carer-1", "admin-1"] }),
    );
  });

  it("reads nothing until the chat asks, and nothing for a ride that is gone", async () => {
    await syncRideChat("ride-1");
    expect(participants).not.toHaveBeenCalled();
    sync.mockClear();
    participants.mockResolvedValue(null);
    expect(await loaded(true)).toBeNull();
  });
});

describe("syncRiderChats", () => {
  it("brings every chat of the rider's rides still ahead in step", async () => {
    (rides.upcomingRideIdsOf as jest.Mock).mockResolvedValue([
      "ride-1",
      "ride-2",
    ]);
    await syncRiderChats("managed-greta");
    expect(rides.upcomingRideIdsOf).toHaveBeenCalledWith(["managed-greta"]);
    expect(sync.mock.calls.map(([input]) => input.rideId)).toEqual([
      "ride-1",
      "ride-2",
    ]);
  });
});
