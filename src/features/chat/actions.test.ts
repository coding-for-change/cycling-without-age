import { chat } from "@/features/chat/index";
import { createGroupChat } from "@/use-cases/chat/create-group-chat";
import {
  createGroupChatAction,
  toggleReactionAction,
} from "@/features/chat/actions";

jest.mock("@/lib/auth-guards", () => ({
  requireAuth: jest.fn(async () => ({
    user: { id: "user-bo" },
    access: { role: null, countryAdminOf: [], memberships: [] },
  })),
}));
jest.mock("@/lib/avatar", () => ({
  avatarSeed: (email: string) => email,
  avatarSvg: () => "<svg />",
}));
jest.mock("@/use-cases/chat/chat-inbox", () => ({ syncInbox: jest.fn() }));
jest.mock("@/use-cases/chat/start-direct-chat", () => ({
  searchPeople: jest.fn(),
  startDirectChatWithUser: jest.fn(),
}));
jest.mock("@/use-cases/chat/create-group-chat", () => ({
  createGroupChat: jest.fn(async () => ({ conversationId: "conv-1" })),
}));
jest.mock("@/features/chat/index", () => ({
  ...jest.requireActual("@/features/chat/schemas"),
  chat: { toggleReaction: jest.fn(async () => []) },
}));

const toggleReaction = chat.toggleReaction as jest.Mock;
const createGroup = createGroupChat as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("toggleReactionAction", () => {
  it("refuses a reaction that is not a single emoji", async () => {
    await expect(
      toggleReactionAction({ messageId: "m1", emoji: "thumbs" }),
    ).resolves.toEqual({ ok: false, error: "generic" });
    expect(toggleReaction).not.toHaveBeenCalled();
  });

  it("allows thirty reactions in ten seconds and parks the thirty-first", async () => {
    for (let i = 0; i < 30; i++) {
      await expect(
        toggleReactionAction({ messageId: `m${i}`, emoji: "👍" }),
      ).resolves.toEqual({ ok: true, reactions: [] });
    }

    await expect(
      toggleReactionAction({ messageId: "m31", emoji: "👍" }),
    ).resolves.toEqual({ ok: false, error: "rateLimited" });
    expect(toggleReaction).toHaveBeenCalledTimes(30);
  });
});

describe("createGroupChatAction", () => {
  it("hands the use case a single-line title", async () => {
    await expect(
      createGroupChatAction({
        title: "Saturday\n\n crew",
        chapterId: "c1",
        memberUserIds: ["a", "b"],
      }),
    ).resolves.toEqual({ ok: true, conversationId: "conv-1" });

    expect(createGroup).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Saturday crew" }),
    );
  });
});
