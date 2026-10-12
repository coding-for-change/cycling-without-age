import { chat } from "@/features/chat";
import { membership } from "@/features/membership";
import { rides } from "@/features/rides";
import { syncRideChat } from "./ride-chat";

jest.mock("@/features/chat", () => ({
  chat: { syncRideConversation: jest.fn(), hasRideConversation: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { listChapterAdmins: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { listRideParticipants: jest.fn(), getRideFacts: jest.fn() },
}));

const participants = rides.listRideParticipants as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (rides.getRideFacts as jest.Mock).mockResolvedValue({
    title: null,
    locationName: "Sonnenhof",
  });
  (membership.listChapterAdmins as jest.Mock).mockResolvedValue([
    { userId: "admin-1" },
  ]);
  (chat.syncRideConversation as jest.Mock).mockResolvedValue("conv-1");
  (chat.hasRideConversation as jest.Mock).mockResolvedValue(false);
});

describe("syncRideChat", () => {
  it("opens the chat once a pilot is on, with the riders' side and the admins", async () => {
    participants.mockResolvedValue({
      chapterId: "chapter-1",
      pilotUserIds: ["pilot-1"],
      riderAccountUserIds: ["carer-1"],
    });
    expect(await syncRideChat("ride-1")).toBe("conv-1");
    expect(chat.syncRideConversation).toHaveBeenCalledWith({
      rideId: "ride-1",
      chapterId: "chapter-1",
      title: "Sonnenhof",
      memberUserIds: ["pilot-1", "carer-1", "admin-1"],
    });
  });

  it("opens no chat for a ride nobody pilots yet", async () => {
    participants.mockResolvedValue({
      chapterId: "chapter-1",
      pilotUserIds: [],
      riderAccountUserIds: ["carer-1"],
    });
    expect(await syncRideChat("ride-1")).toBeNull();
    expect(chat.syncRideConversation).not.toHaveBeenCalled();
  });

  it("keeps an existing chat in step when the last pilot leaves", async () => {
    (chat.hasRideConversation as jest.Mock).mockResolvedValue(true);
    participants.mockResolvedValue({
      chapterId: "chapter-1",
      pilotUserIds: [],
      riderAccountUserIds: ["carer-1"],
    });
    await syncRideChat("ride-1");
    expect(chat.syncRideConversation).toHaveBeenCalledWith(
      expect.objectContaining({ memberUserIds: ["carer-1", "admin-1"] }),
    );
  });

  it("does nothing for a ride that is gone", async () => {
    participants.mockResolvedValue(null);
    expect(await syncRideChat("ride-1")).toBeNull();
  });
});
