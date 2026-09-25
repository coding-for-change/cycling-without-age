import { ObserverPlugin, TolgeeCore } from "@tolgee/web";
import { formatMessage } from "./format";
import { keyMarker } from "./translator-marker";

describe("keyMarker", () => {
  const tolgee = TolgeeCore()
    .use(ObserverPlugin())
    .init({
      language: "en",
      observerType: "invisible",
      observerOptions: { fullKeyEncode: true },
    });

  beforeAll(() => tolgee.run());
  afterAll(() => tolgee.stop());

  it("matches what Tolgee writes", () => {
    const text = "Hello World";
    expect(text + keyMarker("home.title", "app")).toBe(
      tolgee.wrap({ key: "home.title", ns: "app", translation: text }),
    );
  });

  it("survives ICU formatting and decodes to its key", () => {
    const template = `{count, plural, one {1 seat} other {# seats}}${keyMarker("fleet.common.seats", "app")}`;
    expect(tolgee.unwrap(formatMessage(template, { count: 3 }, "en"))).toEqual({
      text: "3 seats",
      keys: [{ key: "fleet.common.seats", ns: "app" }],
    });
  });

  it("encodes non-ASCII keys", () => {
    expect(tolgee.unwrap(`Å${keyMarker("ønske.å", "app")}`).keys).toEqual([
      { key: "ønske.å", ns: "app" },
    ]);
  });
});
