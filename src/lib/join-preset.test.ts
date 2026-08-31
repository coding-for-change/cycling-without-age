import { encodeJoinPreset, parseJoinPreset } from "./join-preset";

describe("parseJoinPreset", () => {
  it("round-trips a full preset", () => {
    const preset = { chapterId: "abc123", role: "passenger" as const };
    expect(parseJoinPreset(encodeJoinPreset(preset))).toEqual(preset);
  });

  it("reads a chapter-only preset", () => {
    expect(parseJoinPreset("abc123|")).toEqual({
      chapterId: "abc123",
      role: null,
    });
  });

  it("drops a role it does not recognise, so a cookie cannot invent one", () => {
    expect(parseJoinPreset("abc123|admin").role).toBeNull();
    expect(parseJoinPreset("abc123|superadmin").role).toBeNull();
  });

  it("drops a chapter id that is not an id", () => {
    expect(parseJoinPreset("../../etc|pilot").chapterId).toBeNull();
    expect(parseJoinPreset(`${"x".repeat(65)}|pilot`).chapterId).toBeNull();
  });

  it("survives nonsense and an absent cookie", () => {
    expect(parseJoinPreset(undefined)).toEqual({ chapterId: null, role: null });
    expect(parseJoinPreset("")).toEqual({ chapterId: null, role: null });
    expect(parseJoinPreset("|||")).toEqual({ chapterId: null, role: null });
  });
});
