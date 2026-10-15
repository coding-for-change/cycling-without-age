import { type AdminViewer, viewerScope } from "./viewer-scope";

const viewer: AdminViewer = {
  chapters: [
    { id: "ch-muc", slug: "muenchen", countryId: "c-de" },
    { id: "ch-ber", slug: "berlin", countryId: "c-de" },
    { id: "ch-cph", slug: "kobenhavn", countryId: "c-dk" },
  ],
  countries: [
    { id: "c-de", code: "DE" },
    { id: "c-dk", code: "DK" },
  ],
  stored: "chapter:muenchen",
};

const params = (query: string) => new URLSearchParams(query);

describe("viewerScope", () => {
  it("falls back to the stored scope without a URL scope", () => {
    expect(viewerScope(params(""), viewer)).toEqual({
      scopeQuery: "",
      chapterId: "ch-muc",
      chapterIds: ["ch-muc"],
      countryIds: ["c-de"],
    });
  });

  it("reads a chapter from the URL case-insensitively", () => {
    const scope = viewerScope(params("chapter=Berlin"), viewer);
    expect(scope.chapterId).toBe("ch-ber");
    expect(scope.scopeQuery).toBe("?chapter=berlin");
  });

  it("has no single chapter in a country scope, even with one chapter", () => {
    const scope = viewerScope(params("country=dk"), viewer);
    expect(scope.chapterId).toBeNull();
    expect(scope.chapterIds).toEqual(["ch-cph"]);
    expect(scope.countryIds).toEqual(["c-dk"]);
  });

  it("ignores a chapter the viewer cannot reach", () => {
    const scope = viewerScope(params("chapter=hamburg"), viewer);
    expect(scope.chapterIds).not.toContain("hamburg");
    expect(scope.chapterIds.every((id) => id.startsWith("ch-"))).toBe(true);
  });
});
