import {
  parse,
  TYPE,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";

const NUMBER = "\\d[\\d.,\\u00a0\\u202f]*";

const FILLERS: Record<string, string> = {
  count: NUMBER,
  total: NUMBER,
  current: NUMBER,
  from: NUMBER,
  to: NUMBER,
  page: NUMBER,
  max: NUMBER,
  members: NUMBER,
  passengers: NUMBER,
  pending: NUMBER,
  chapters: NUMBER,
  word: "\\p{Lu}+",
};

const HAS_LETTER = /\p{L}/u;
const TYPED_BY_USER = "input, textarea, [contenteditable]";
const SAMPLE_INPUT = /placeholder/i;

type Part = { text: string } | { filler: string | null };
type Variant = Part[];

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const leaves = (node: unknown): string[] => {
  if (typeof node === "string") return [node];
  if (node && typeof node === "object")
    return Object.entries(node)
      .filter(([key]) => !SAMPLE_INPUT.test(key))
      .flatMap(([, value]) => leaves(value));
  return [];
};

const product = (heads: Variant[], tails: Variant[]): Variant[] =>
  heads.flatMap((head) => tails.map((tail) => [...head, ...tail]));

const branches = (element: MessageFormatElement): Variant[] => {
  switch (element.type) {
    case TYPE.literal:
      return [[{ text: element.value }]];
    case TYPE.argument:
      return [[{ filler: FILLERS[element.value] ?? null }]];
    case TYPE.number:
    case TYPE.pound:
      return [[{ filler: NUMBER }]];
    case TYPE.plural:
    case TYPE.select:
      return Object.values(element.options).flatMap((option) =>
        variants(option.value),
      );
    case TYPE.tag:
      return variants(element.children);
    default:
      return [[{ filler: null }]];
  }
};

const variants = (elements: MessageFormatElement[]): Variant[] =>
  elements.reduce<Variant[]>(
    (acc, element) => product(acc, branches(element)),
    [[]],
  );

const segments = (variant: Variant): string[] =>
  variant.reduce<string[]>(
    (acc, part) => {
      if ("text" in part) acc[acc.length - 1] += part.text;
      else acc.push("");
      return acc;
    },
    [""],
  );

const variantPattern = (variant: Variant): string | null => {
  const fillers = variant.flatMap((part) =>
    "filler" in part ? [part.filler] : [],
  );
  if (fillers.some((filler) => filler === null)) return null;
  const texts = segments(variant);
  texts[0] = texts[0].trimStart();
  texts[texts.length - 1] = texts[texts.length - 1].trimEnd();
  return texts
    .map((text, index) =>
      index === 0 ? escape(text) : `${fillers[index - 1]}${escape(text)}`,
    )
    .join("");
};

const parsed = (template: string): Variant[] => {
  try {
    return variants(parse(template));
  } catch {
    return [[{ text: template }]];
  }
};

export class StaticText {
  private readonly exact = new Set<string>();
  private readonly patterns: string[] = [];
  private combined: RegExp | null = null;

  add(dictionary: unknown): this {
    for (const leaf of leaves(dictionary)) {
      for (const variant of parsed(leaf)) {
        const texts = segments(variant);
        if (texts.length === 1) {
          const text = texts[0].trim();
          if (text) this.exact.add(text);
          continue;
        }
        for (const fragment of texts) {
          const trimmed = fragment.trim();
          if (HAS_LETTER.test(trimmed)) this.exact.add(trimmed);
        }
        const pattern = variantPattern(variant);
        if (pattern) this.patterns.push(pattern);
      }
    }
    this.combined = this.patterns.length
      ? new RegExp(`^(?:${this.patterns.join("|")})$`, "u")
      : null;
    return this;
  }

  has(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    return this.exact.has(trimmed) || Boolean(this.combined?.test(trimmed));
  }
}

const mask = (text: string) => text.replace(/\S/g, "*");

export const maskUnlessStatic =
  (staticText: StaticText) =>
  (text: string, element?: Element | null): string => {
    if (element?.closest?.(TYPED_BY_USER)) return mask(text);
    return staticText.has(text) ? text : mask(text);
  };
