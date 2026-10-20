import { rankChapters, shortlist } from "./rank";

const chapter = (
  id: string,
  name: string,
  coords: { lat: number; lng: number },
  careHomeName: string | null = null,
) => ({ id, name, city: name, careHomeName, coords });

const MUNICH = chapter("m", "München", { lat: 48.1361, lng: 11.5647 });
const HAMBURG = chapter("h", "Hamburg", { lat: 53.5603, lng: 9.9906 });
const COPENHAGEN = chapter("c", "København", { lat: 55.6884, lng: 12.5527 });

const all = [MUNICH, HAMBURG, COPENHAGEN];
const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

describe("rankChapters", () => {
  it("orders by distance when the viewer's position is known", () => {
    const rows = rankChapters({
      chapters: all,
      query: "",
      here: { lat: 53.55, lng: 10.0 },
      locale: "de",
    });
    expect(ids(rows)).toEqual(["h", "c", "m"]);
  });

  it("puts the nearest first from a different vantage point", () => {
    const rows = rankChapters({
      chapters: all,
      query: "",
      here: MUNICH.coords,
      locale: "de",
    });
    // Not alphabetical order — proof the distance term is doing the work.
    expect(ids(rows)).toEqual(["m", "h", "c"]);
    expect(rows[0].distance).toBe(0);
  });

  it("falls back to alphabetical order with no position", () => {
    const rows = rankChapters({
      chapters: all,
      query: "",
      here: null,
      locale: "de",
    });
    expect(ids(rows)).toEqual(["h", "c", "m"]);
    expect(rows.every((row) => row.distance === null)).toBe(true);
  });

  it("matches on name, city and care home", () => {
    const withHome = [
      { ...MUNICH, careHomeName: "Seniorenheim Sonnenhof" },
      HAMBURG,
    ];
    const find = (query: string) =>
      ids(
        rankChapters({ chapters: withHome, query, here: null, locale: "de" }),
      );
    expect(find("sonnenhof")).toEqual(["m"]);
    expect(find("hamb")).toEqual(["h"]);
    expect(find("zzz")).toEqual([]);
  });

  it("ignores case and surrounding whitespace in the query", () => {
    const rows = rankChapters({
      chapters: all,
      query: "  MÜNCHEN ",
      here: null,
      locale: "de",
    });
    expect(ids(rows)).toEqual(["m"]);
  });
});

describe("shortlist", () => {
  const rows = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}` }));

  it("shows the first six and counts the rest", () => {
    const { shown, hidden } = shortlist({ rows, query: "", selected: [] });
    expect(shown.map((row) => row.id)).toEqual([
      "c0",
      "c1",
      "c2",
      "c3",
      "c4",
      "c5",
    ]);
    expect(hidden).toBe(3);
  });

  it("keeps a selected chapter visible beyond the shortlist", () => {
    const { shown, hidden } = shortlist({ rows, query: "", selected: ["c8"] });
    expect(shown.map((row) => row.id)).toContain("c8");
    expect(hidden).toBe(2);
  });

  it("shows every match while searching", () => {
    expect(shortlist({ rows, query: "mü", selected: [] })).toEqual({
      shown: rows,
      hidden: 0,
    });
  });
});
