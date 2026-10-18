import { getInitials, nameParts, splitName } from "@/lib/utils";

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

describe("splitName", () => {
  it("takes the last word as the surname", () => {
    expect(splitName("  Pernille  Marie Holm ")).toEqual({
      firstName: "Pernille Marie",
      lastName: "Holm",
    });
  });

  it("keeps a single word as the first name", () => {
    expect(splitName("Cher")).toEqual({ firstName: "Cher", lastName: "" });
    expect(splitName("   ")).toEqual({ firstName: "", lastName: "" });
  });
});

describe("nameParts", () => {
  it("trusts the rider row while it adds up to the account name", () => {
    expect(
      nameParts("Jan van der Berg", {
        firstName: "Jan",
        lastName: "van der Berg",
      }),
    ).toEqual({ firstName: "Jan", lastName: "van der Berg" });
  });

  it("follows the account name once it was renamed elsewhere", () => {
    expect(
      nameParts("Anna Berg", { firstName: "Anna", lastName: "Holm" }),
    ).toEqual({ firstName: "Anna", lastName: "Berg" });
  });
});
