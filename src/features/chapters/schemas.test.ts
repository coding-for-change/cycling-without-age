import { chapterInput, slugify } from "./schemas";

describe("slugify", () => {
  it.each([
    ["Aarhus Nord", "aarhus-nord"],
    ["München – Schwabing", "munchen-schwabing"],
    ["Ærøskøbing Plejehjem", "aeroskobing-plejehjem"],
    ["  Straße  ", "strasse"],
    ["---", ""],
  ])("%s → %s", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it("only produces slugs the input schema accepts", () => {
    for (const name of ["Café Ålborg", "Zürich West 2", "A".repeat(80)]) {
      expect(chapterInput.shape.slug.safeParse(slugify(name)).success).toBe(
        true,
      );
    }
  });
});

describe("chapter logo", () => {
  it("takes web addresses only", () => {
    const parse = (logo: string) =>
      chapterInput.shape.logo.safeParse(logo).success;
    expect(parse("https://example.org/logo.png")).toBe(true);
    expect(parse("javascript:alert(1)")).toBe(false);
    expect(parse("data:image/png;base64,AAAA")).toBe(false);
  });
});
