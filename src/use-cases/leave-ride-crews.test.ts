import { chat } from "@/features/chat";
import { rides } from "@/features/rides";
import type { EventOf } from "@/lib/events/catalog";
import { leaveRideCrews } from "./leave-ride-crews";
import { syncRideChat } from "./ride-chat";

jest.mock("@/features/chat", () => ({
  chat: { listRideChatsOf: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { reopenStaffingChecksOf: jest.fn() },
}));
jest.mock("./ride-chat", () => ({ syncRideChat: jest.fn() }));

const change = (
  overrides: Partial<EventOf<"member.roleChanged">>,
): EventOf<"member.roleChanged"> => ({
  type: "member.roleChanged",
  chapterId: "chapter-1",
  userId: "user-1",
  actorUserId: "admin-1",
  change: "demote",
  roles: [],
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  (chat.listRideChatsOf as jest.Mock).mockResolvedValue(["ride-1", "ride-2"]);
});

describe("leaveRideCrews", () => {
  it("checks a demoted pilot's rides again and brings their chats in step", async () => {
    await leaveRideCrews(change({ roles: ["passenger"] }));
    expect(rides.reopenStaffingChecksOf).toHaveBeenCalledWith(
      "user-1",
      "chapter-1",
    );
    expect(chat.listRideChatsOf).toHaveBeenCalledWith("user-1", "chapter-1");
    expect((syncRideChat as jest.Mock).mock.calls).toEqual([
      ["ride-1"],
      ["ride-2"],
    ]);
  });

  it("leaves the seats of someone who still pilots", async () => {
    await leaveRideCrews(change({ roles: ["pilot"] }));
    expect(rides.reopenStaffingChecksOf).not.toHaveBeenCalled();
    expect(syncRideChat).toHaveBeenCalledTimes(2);
  });

  it("does nothing for a promotion", async () => {
    await leaveRideCrews(change({ change: "promote", roles: ["pilot"] }));
    expect(rides.reopenStaffingChecksOf).not.toHaveBeenCalled();
    expect(chat.listRideChatsOf).not.toHaveBeenCalled();
  });
});
