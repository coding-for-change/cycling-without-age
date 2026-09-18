import {
  createGroupInput,
  isSingleEmoji,
  toggleReactionInput,
} from "./schemas";

describe("isSingleEmoji", () => {
  it.each(["👍", "❤️", "😂", "🙏", "🇩🇰", "1️⃣", "👨‍👩‍👧"])("accepts %s", (value) => {
    expect(isSingleEmoji(value)).toBe(true);
  });

  it.each(["", "a", "ab", "👍👍", "👍 ", ":+1:"])("rejects %j", (value) => {
    expect(isSingleEmoji(value)).toBe(false);
  });
});

describe("toggleReactionInput", () => {
  it("refuses anything that is not exactly one emoji", () => {
    expect(
      toggleReactionInput.safeParse({
        messageId: "m1",
        userId: "u1",
        emoji: "thumbs",
      }).success,
    ).toBe(false);
  });
});

describe("createGroupInput", () => {
  const base = {
    chapterId: "c1",
    createdByUserId: "creator",
    memberUserIds: ["a", "b"],
  };

  it("collapses line breaks and runs of whitespace in the title", () => {
    const parsed = createGroupInput.parse({
      ...base,
      title: "  Saturday\n\n  crew\t2 ",
    });

    expect(parsed.title).toBe("Saturday crew 2");
  });

  it("refuses a title that is only whitespace", () => {
    expect(createGroupInput.safeParse({ ...base, title: " \n " }).success).toBe(
      false,
    );
  });
});
