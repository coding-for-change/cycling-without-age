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

const PLACEHOLDER = /\{(\w+)\}/g;
const HAS_LETTER = /\p{L}/u;
const TYPED_BY_USER = "input, textarea, [contenteditable]";
const SAMPLE_INPUT = /placeholder/i;

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const leaves = (node: unknown): string[] => {
  if (typeof node === "string") return [node];
  if (node && typeof node === "object")
    return Object.entries(node)
      .filter(([key]) => !SAMPLE_INPUT.test(key))
      .flatMap(([, value]) => leaves(value));
  return [];
};

const templatePattern = (template: string): string | null => {
  const names = [...template.matchAll(PLACEHOLDER)].map(([, name]) => name);
  if (!names.every((name) => Object.hasOwn(FILLERS, name))) return null;
  const parts = template.split(PLACEHOLDER);
  return parts
    .map((part, index) => (index % 2 === 0 ? escape(part) : FILLERS[part]))
    .join("");
};

export class StaticText {
  private readonly exact = new Set<string>();
  private readonly patterns: string[] = [];
  private combined: RegExp | null = null;

  add(dictionary: unknown): this {
    for (const leaf of leaves(dictionary)) {
      const text = leaf.trim();
      if (!text.includes("{")) {
        this.exact.add(text);
        continue;
      }
      for (const fragment of text
        .split(PLACEHOLDER)
        .filter((_, i) => i % 2 === 0)) {
        const trimmed = fragment.trim();
        if (HAS_LETTER.test(trimmed)) this.exact.add(trimmed);
      }
      const pattern = templatePattern(text);
      if (pattern) this.patterns.push(pattern);
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
