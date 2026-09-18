import {
  PREVIEW_MAX_CHARS,
  previewOf,
  stripMarkdown,
} from "@/use-cases/chat-notifications/preview";

describe("stripMarkdown", () => {
  it.each([
    ["**bold**", "bold"],
    ["_italic_", "italic"],
    ["~~struck~~", "struck"],
    ["`code`", "code"],
    ["# Heading", "Heading"],
    ["> quoted", "quoted"],
    ["- a list item", "a list item"],
    ["1. first", "first"],
    ["---", ""],
  ])("unwraps %s", (source, expected) => {
    expect(stripMarkdown(source)).toBe(expected);
  });

  it("keeps the words of a link and drops the address", () => {
    expect(stripMarkdown("See [the route](https://example.com/route)")).toBe(
      "See the route",
    );
  });

  it("keeps the alt text of an image", () => {
    expect(stripMarkdown("![the trishaw](https://example.com/t.png)")).toBe(
      "the trishaw",
    );
  });

  it("folds a fenced block into one line", () => {
    expect(stripMarkdown("```js\nconst a = 1;\n```")).toBe("const a = 1;");
  });

  it("puts a multi-line message on one line", () => {
    expect(stripMarkdown("Saturday?\n\nAt ten, maybe")).toBe(
      "Saturday? At ten, maybe",
    );
  });

  it("leaves plain words and emoji alone", () => {
    expect(stripMarkdown("See you at ten 🚲")).toBe("See you at ten 🚲");
  });
});

describe("previewOf", () => {
  it("returns a short message whole", () => {
    expect(previewOf("See you at ten")).toBe("See you at ten");
  });

  it("cuts a long message to the banner length with an ellipsis", () => {
    const preview = previewOf("a ".repeat(200));

    expect(preview).toHaveLength(PREVIEW_MAX_CHARS);
    expect(preview.endsWith("…")).toBe(true);
  });

  it("takes the length limit from the caller", () => {
    expect(previewOf("Wind in your hair", 10)).toBe("Wind in y…");
  });
});
