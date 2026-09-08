import { kindOf, kinds } from "@/use-cases/notifications/kinds";

jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn() },
}));

describe("kinds", () => {
  it("defines at most one kind per event", () => {
    const events = kinds.map((kind) => kind.event);
    expect(new Set(events).size).toBe(events.length);
  });

  it("finds a kind by its event", () => {
    expect(kindOf("pilotApplication.decided").category).toBe("application");
  });

  it("refuses an event nobody defined a kind for", () => {
    expect(() => kindOf("ride.requested")).toThrow(
      "no kind for ride.requested",
    );
  });
});
