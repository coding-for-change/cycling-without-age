import { tokenize } from "./composer-highlight";

const roundTrip = (text: string) =>
  tokenize(text)
    .map((token) => token.value)
    .join("");

const types = (text: string) => tokenize(text).map((token) => token.type);

describe("tokenize", () => {
  it("keeps every character, so the mirror lines up with the textarea", () => {
    const samples = [
      "",
      "plain words",
      "**bold** and _italic_ and ~~gone~~ and `code`",
      "https://cyclingwithoutage.org/brand-book/ is the source",
      "snake_case_name stays whole",
      "unclosed **bold and *italic",
      "line one\nline **two**\n\nline three",
      "****",
      "a *b* c _d_ e ~~f~~ g `h`",
    ];
    for (const sample of samples) expect(roundTrip(sample)).toBe(sample);
  });

  it("marks the four inline styles", () => {
    expect(types("**a**")).toEqual(["bold"]);
    expect(types("_a_")).toEqual(["italic"]);
    expect(types("*a*")).toEqual(["italic"]);
    expect(types("~~a~~")).toEqual(["strike"]);
    expect(types("`a`")).toEqual(["code"]);
  });

  it("prefers bold over italic at a double star", () => {
    expect(tokenize("**hello**")).toEqual([
      { type: "bold", value: "**hello**" },
    ]);
  });

  it("leaves underscores inside a word alone", () => {
    expect(types("snake_case_name")).toEqual(["text"]);
  });

  it("does not open a span on whitespace", () => {
    expect(types("2 * 3 * 4")).toEqual(["text"]);
    expect(types("a ** b")).toEqual(["text"]);
  });

  it("stops a span at a newline", () => {
    expect(types("*start\nend*")).toEqual(["text"]);
  });

  it("picks up links and drops trailing punctuation", () => {
    expect(tokenize("see https://example.com/a.")).toEqual([
      { type: "text", value: "see " },
      { type: "link", value: "https://example.com/a" },
      { type: "text", value: "." },
    ]);
  });

  it("ignores a url glued to a word", () => {
    expect(types("xhttps://example.com")).toEqual(["text"]);
  });

  it("does not style inside a code span", () => {
    expect(tokenize("`**not bold**`")).toEqual([
      { type: "code", value: "`**not bold**`" },
    ]);
  });

  it("splits a mixed line into its parts", () => {
    expect(tokenize("hi **there** you")).toEqual([
      { type: "text", value: "hi " },
      { type: "bold", value: "**there**" },
      { type: "text", value: " you" },
    ]);
  });
});
