import { backDepth } from "./use-can-go-back";

describe("backDepth", () => {
  it("starts at 0 on a fresh entry", () => {
    expect(backDepth(null, -1)).toBe(0);
  });

  it("counts up on unstamped pushes", () => {
    expect(backDepth({}, 0)).toBe(1);
    expect(backDepth({}, 1)).toBe(2);
  });

  it("restores the stamped depth when going back", () => {
    expect(backDepth({ cwaDepth: 0 }, 2)).toBe(0);
  });
});
