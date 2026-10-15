import {
  COMPILED_CACHE_SIZE,
  compiledCacheSize,
  formatMessage,
} from "./format";

describe("formatMessage", () => {
  it("formats ICU messages", () => {
    expect(
      formatMessage(
        "{count, plural, one {# seat} other {# seats}}",
        { count: 2 },
        "en",
      ),
    ).toBe("2 seats");
  });

  it("keeps the compiled cache bounded", () => {
    for (let index = 0; index < COMPILED_CACHE_SIZE + 500; index++)
      formatMessage(`Template ${index} {name}`, { name: "x" }, "en");
    expect(compiledCacheSize()).toBe(COMPILED_CACHE_SIZE);
    expect(formatMessage("Template 10 {name}", { name: "y" }, "en")).toBe(
      "Template 10 y",
    );
  });
});
