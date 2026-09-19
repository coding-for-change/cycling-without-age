import { previewLine, stripPreview } from "./preview";

describe("stripPreview", () => {
  it("drops inline markers but keeps the words", () => {
    expect(stripPreview("**Saturday** is _on_ ~~again~~ `sharp`")).toBe(
      "Saturday is on again sharp",
    );
  });

  it("keeps the label of a link", () => {
    expect(stripPreview("see [the route](https://example.com)")).toBe(
      "see the route",
    );
  });

  it("drops list, quote and heading markers", () => {
    expect(stripPreview("# Plan\n- bring cake\n> and a blanket")).toBe(
      "Plan bring cake and a blanket",
    );
  });

  it("collapses newlines into one line", () => {
    expect(stripPreview("one\n\ntwo\nthree")).toBe("one two three");
  });

  it("truncates with an ellipsis", () => {
    expect(stripPreview("abcdefghij", 4)).toBe("abcd…");
    expect(stripPreview("abcd", 4)).toBe("abcd");
  });

  it("unescapes a backslashed marker", () => {
    expect(stripPreview("a \\* b")).toBe("a * b");
  });

  it("leaves a bare underscore inside a word", () => {
    expect(stripPreview("chapter_name")).toBe("chapter_name");
  });
});

describe("previewLine", () => {
  it("prefixes the sender", () => {
    expect(previewLine("**hello**", "Anna")).toBe("Anna: hello");
  });

  it("returns the body alone without a prefix", () => {
    expect(previewLine("hello", null)).toBe("hello");
  });

  it("falls back to the prefix when nothing survives stripping", () => {
    expect(previewLine("   ", "You")).toBe("You");
  });
});
