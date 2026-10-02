import { getInitials } from "@/lib/utils";

describe("getInitials", () => {
  it("takes the first two words", () => {
    expect(getInitials("Sanne Superadmin")).toBe("SS");
  });

  it("skips separators, so a chapter name is not initialled as a dash", () => {
    expect(getInitials("Hamburg – Alstergarten")).toBe("HA");
    expect(getInitials("München – Seniorenheim Sonnenhof")).toBe("MS");
  });

  it("handles a single word, an email and empty input", () => {
    expect(getInitials("Hamburg")).toBe("H");
    expect(getInitials("multi@cwa.local")).toBe("M");
    expect(getInitials("")).toBe("");
    expect(getInitials("  –  ")).toBe("");
  });
});
