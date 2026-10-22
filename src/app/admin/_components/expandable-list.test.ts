import { fittingCount } from "./expandable-list";

describe("fittingCount", () => {
  it("shows every row when all of them fit", () => {
    expect(
      fittingCount({ top: 400, viewport: 1000, rowHeight: 55, total: 8 }),
    ).toBe(8);
  });

  it("keeps room for the show-all row when rows overflow", () => {
    expect(
      fittingCount({ top: 400, viewport: 1000, rowHeight: 55, total: 20 }),
    ).toBe(9);
  });

  it("never shows fewer than three rows", () => {
    expect(
      fittingCount({ top: 900, viewport: 1000, rowHeight: 55, total: 20 }),
    ).toBe(3);
  });

  it("falls back to six rows before anything is measured", () => {
    expect(
      fittingCount({ top: 0, viewport: 1000, rowHeight: 0, total: 20 }),
    ).toBe(6);
  });
});
