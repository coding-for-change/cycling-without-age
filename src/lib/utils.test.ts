import { fill, getInitials } from "@/lib/utils";

describe("fill", () => {
  it("substitutes named placeholders", () => {
    expect(fill("Hello {name}, {n} rides", { name: "Ole", n: 3 })).toBe(
      "Hello Ole, 3 rides",
    );
  });

  it("leaves an unknown placeholder visible rather than printing undefined", () => {
    expect(fill("{a} and {b}", { a: "x" })).toBe("x and {b}");
  });

  it("substitutes a repeated placeholder everywhere", () => {
    expect(fill("{x}-{x}", { x: "1" })).toBe("1-1");
  });

  it("passes a template with no placeholders through untouched", () => {
    expect(fill("plain", {})).toBe("plain");
  });
});

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
