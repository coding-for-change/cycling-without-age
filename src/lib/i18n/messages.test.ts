import {
  parse,
  TYPE,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";
import { IntlMessageFormat } from "intl-messageformat";
import appDa from "@/messages/app/da.json";
import appDe from "@/messages/app/de.json";
import appEn from "@/messages/app/en.json";
import emailDa from "@/messages/email/da.json";
import emailDe from "@/messages/email/de.json";
import emailEn from "@/messages/email/en.json";
import errorsDa from "@/messages/errors/da.json";
import errorsDe from "@/messages/errors/de.json";
import errorsEn from "@/messages/errors/en.json";
import { locales, type Locale } from "./locales";

const NAMESPACES: Record<string, Record<Locale, unknown>> = {
  app: { en: appEn, da: appDa, de: appDe },
  email: { en: emailEn, da: emailDa, de: emailDe },
  errors: { en: errorsEn, da: errorsDa, de: errorsDe },
};

const flatten = (node: unknown, path = ""): Map<string, unknown> => {
  if (node && typeof node === "object")
    return new Map(
      Object.entries(node).flatMap(([key, value]) => [
        ...flatten(value, path ? `${path}.${key}` : key),
      ]),
    );
  return new Map([[path, node]]);
};

const walk = (
  elements: MessageFormatElement[],
  visit: (element: MessageFormatElement) => void,
) => {
  for (const element of elements) {
    visit(element);
    if (element.type === TYPE.plural || element.type === TYPE.select)
      for (const option of Object.values(element.options))
        walk(option.value, visit);
    if (element.type === TYPE.tag) walk(element.children, visit);
  }
};

const argumentNames = (message: string) => {
  const names = new Set<string>();
  walk(parse(message), (element) => {
    if ("value" in element && element.type !== TYPE.literal)
      names.add(element.value);
  });
  return [...names].sort();
};

const missingCategories = (message: string, locale: Locale) => {
  const required = new Intl.PluralRules(locale).resolvedOptions()
    .pluralCategories;
  const missing: string[] = [];
  walk(parse(message), (element) => {
    if (element.type !== TYPE.plural || element.pluralType === "ordinal")
      return;
    for (const category of required)
      if (!Object.hasOwn(element.options, category))
        missing.push(`${element.value}:${category}`);
  });
  return missing;
};

describe.each(Object.entries(NAMESPACES))("the %s messages", (_, byLocale) => {
  const reference = flatten(byLocale.en);

  describe.each(locales)("in %s", (locale) => {
    const messages = flatten(byLocale[locale]);

    it("carry the same keys as English", () => {
      expect([...messages.keys()].sort()).toEqual([...reference.keys()].sort());
    });

    it("are all non-empty strings", () => {
      const bad = [...messages].filter(
        ([, value]) => typeof value !== "string" || value.trim() === "",
      );
      expect(bad.map(([key]) => key)).toEqual([]);
    });

    it("all parse as ICU messages", () => {
      const broken = [...messages].filter(([, value]) => {
        try {
          new IntlMessageFormat(String(value), locale);
          return false;
        } catch {
          return true;
        }
      });
      expect(broken.map(([key]) => key)).toEqual([]);
    });

    it("take the same arguments as English", () => {
      const differing = [...messages]
        .filter(([key]) => reference.has(key))
        .filter(
          ([key, value]) =>
            argumentNames(String(value)).join() !==
            argumentNames(String(reference.get(key))).join(),
        );
      expect(differing.map(([key]) => key)).toEqual([]);
    });

    it("cover every plural category the language needs", () => {
      const missing = [...messages].flatMap(([key, value]) =>
        missingCategories(String(value), locale).map(
          (category) => `${key} (${category})`,
        ),
      );
      expect(missing).toEqual([]);
    });
  });
});
