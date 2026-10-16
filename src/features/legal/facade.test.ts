import { locales } from "@/lib/i18n/locales";
import { LEGAL_DOCUMENTS } from "@/lib/legal";
import { editionOf, getLegalText } from "./facade";

const PLACEHOLDER = /\[[^\]]+\](?!\()/;

describe("legal texts", () => {
  it.each(
    LEGAL_DOCUMENTS.flatMap((document) =>
      locales.map((locale) => [document, locale] as const),
    ),
  )(
    "%s exists in %s and leaves the title to the page",
    async (document, locale) => {
      const { text } = await getLegalText(document, locale);

      expect(text.trim().length).toBeGreaterThan(0);
      expect(text).not.toMatch(/^# /m);
    },
  );

  it("leaves no placeholder in a document marked final", async () => {
    const final = LEGAL_DOCUMENTS.filter(
      (document) => !editionOf(document).draft,
    );
    const texts = await Promise.all(
      final.flatMap((document) =>
        locales.map(async (locale) => ({
          file: `${document}.${locale}.md`,
          text: (await getLegalText(document, locale)).text,
        })),
      ),
    );

    expect(
      texts
        .filter(({ text }) => PLACEHOLDER.test(text))
        .map(({ file }) => file),
    ).toEqual([]);
  });

  it.each(LEGAL_DOCUMENTS)("%s has an ISO update date", (document) => {
    expect(editionOf(document).updatedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
