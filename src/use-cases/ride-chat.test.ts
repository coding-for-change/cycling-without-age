import { chat, type RideConversationInput } from "@/features/chat";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { rides } from "@/features/rides";
import {
  continueChat,
  freezeCancelledEventChat,
  syncRideChat,
  syncRiderChats,
} from "./ride-chat";

jest.mock("@/features/chat", () => ({
  chat: {
    syncRideConversation: jest.fn(),
    freezeRideConversation: jest.fn(),
    continueConversation: jest.fn(),
    rideIdOf: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfiles: jest.fn() },
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
      household: { riders: 1, accountUserIds: ["carer-1"] },
    });
    expect(await loaded(false)).toEqual({
      chapterId: "chapter-1",
      title: "Sonnenhof",
      ownerUserIds: [],
      marksComingsAndGoings: false,
      memberUserIds: ["pilot-1", "admin-1", "carer-1"],
    });
  });

  describe("an event", () => {
    beforeEach(() =>
      (rides.getRideFacts as jest.Mock).mockResolvedValue({
        title: "Summer fair",
        model: "event",
        locationName: "Sonnenhof",
      }),
    );

    it("opens its chat with the admins as soon as it is scheduled", async () => {
      participants.mockResolvedValue({
        chapterId: "chapter-1",
        pilotUserIds: [],
        riderCount: 0,
        riderAccountUserIds: [],
        household: { riders: 0, accountUserIds: [] },
      });
      expect(await loaded(false)).toEqual({
        chapterId: "chapter-1",
        title: "Summer fair",
        ownerUserIds: ["admin-1"],
        marksComingsAndGoings: true,
        memberUserIds: ["admin-1"],
      });
    });

    it("freezes its chat when it is cancelled", async () => {
      await freezeCancelledEventChat("ride-1");
      expect(chat.freezeRideConversation).toHaveBeenCalledWith("ride-1");
    });

    it("takes in every family that books a seat", async () => {
      participants.mockResolvedValue({
        chapterId: "chapter-1",
        pilotUserIds: ["pilot-1"],
        riderCount: 2,
        riderAccountUserIds: ["carer-1", "carer-2"],
        household: { riders: 2, accountUserIds: ["carer-1", "carer-2"] },
      });
      expect(await loaded(true)).toEqual(
        expect.objectContaining({
          memberUserIds: ["pilot-1", "admin-1", "carer-1", "carer-2"],
        }),
      );
    });

    it("lets a family go once every rider it booked gave the seat up", async () => {
      participants.mockResolvedValue({
        chapterId: "chapter-1",
        pilotUserIds: ["pilot-1"],
        riderCount: 1,
        riderAccountUserIds: ["carer-2"],
        household: { riders: 3, accountUserIds: ["carer-1", "carer-2"] },
      });
      expect(await loaded(true)).toEqual(
        expect.objectContaining({
          memberUserIds: ["pilot-1", "admin-1", "carer-2"],
        }),
      );
    });
  });

  it("takes in a family who books every rider on the ride", async () => {
    participants.mockResolvedValue({
      chapterId: "chapter-1",
      pilotUserIds: ["pilot-1"],
      riderCount: 2,
      riderAccountUserIds: ["carer-1"],
      household: { riders: 2, accountUserIds: ["carer-1"] },
    });
    expect(await loaded(false)).toEqual(
      expect.objectContaining({
        memberUserIds: ["pilot-1", "admin-1", "carer-1"],
      }),
    );
  });

  it("takes in a rider and whoever books for them", async () => {
    participants.mockResolvedValue({
      chapterId: "chapter-1",
      pilotUserIds: ["pilot-1"],
      riderCount: 1,
      riderAccountUserIds: ["carer-1", "rider-1"],
      household: { riders: 1, accountUserIds: ["carer-1", "rider-1"] },
    });
    expect(await loaded(false)).toEqual(
      expect.objectContaining({
        memberUserIds: ["pilot-1", "admin-1", "carer-1", "rider-1"],
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
      household: { riders: 2, accountUserIds: ["carer-1", "carer-2"] },
    });
    expect(await loaded(false)).toEqual(
      expect.objectContaining({ memberUserIds: ["pilot-1", "admin-1"] }),
    );
  });

  // A gave the seat up: B, still booked, must not read what was said about A.
  it("keeps the other household out when one family gives its seat up", async () => {
    participants.mockResolvedValue({
      chapterId: "chapter-1",
      pilotUserIds: ["pilot-1"],
      riderCount: 1,
      riderAccountUserIds: ["carer-2"],
      household: { riders: 2, accountUserIds: ["carer-1", "carer-2"] },
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
      household: { riders: 1, accountUserIds: ["carer-1"] },
    });
    expect(await loaded(false)).toBeNull();
  });

  it("keeps an existing chat in step when the last pilot leaves", async () => {
    participants.mockResolvedValue({
      chapterId: "chapter-1",
      pilotUserIds: [],
      riderAccountUserIds: ["carer-1"],
      household: { riders: 1, accountUserIds: ["carer-1"] },
    });
    expect(await loaded(true)).toEqual(
      expect.objectContaining({ memberUserIds: ["admin-1", "carer-1"] }),
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

describe("freezeCancelledEventChat", () => {
  it("leaves a cancelled personal ride's chat open", async () => {
    await freezeCancelledEventChat("ride-1");
    expect(chat.freezeRideConversation).not.toHaveBeenCalled();
  });
});

it("names the people who join or leave by their account's name", async () => {
  (profile.getProfiles as jest.Mock).mockResolvedValue([
    { id: "carer-1", name: "Peter Passenger" },
  ]);
  await syncRideChat("ride-1");
  const [input] = sync.mock.calls[0] as [RideConversationInput];
  expect(await input.namesOf(["carer-1"])).toEqual(
    new Map([["carer-1", "Peter Passenger"]]),
  );
});

describe("continueChat", () => {
  const ride = (model: string, status: string) => {
    (chat.rideIdOf as jest.Mock).mockResolvedValue("ride-1");
    (rides.getRideFacts as jest.Mock).mockResolvedValue({ model, status });
  };
  const reopen = async () => {
    await continueChat("conv-1", "carer-1");
    return (chat.continueConversation as jest.Mock).mock.calls[0][0];
  };

  it("leaves reopening a cancelled event's chat to its owners", async () => {
    ride("event", "cancelled");
    expect(await reopen()).toEqual({
      conversationId: "conv-1",
      userId: "carer-1",
      ownersOnly: true,
    });
  });

  it("lets anyone in it reopen a completed event's chat", async () => {
    ride("event", "completed");
    expect(await reopen()).toMatchObject({ ownersOnly: false });
  });

  it("lets anyone in it reopen a cancelled personal ride's chat", async () => {
    ride("pleasure", "cancelled");
    expect(await reopen()).toMatchObject({ ownersOnly: false });
  });

  it("lets anyone reopen a chat that belongs to no ride", async () => {
    (chat.rideIdOf as jest.Mock).mockResolvedValue(null);
    expect(await reopen()).toMatchObject({ ownersOnly: false });
    expect(rides.getRideFacts).not.toHaveBeenCalled();
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
