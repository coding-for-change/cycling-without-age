export const PREVIEW_MAX_CHARS = 140;

const RULES: [RegExp, string][] = [
  [/```[\w-]*\n?/g, " "],
  [/!\[([^\]]*)\]\([^)]*\)/g, "$1"],
  [/\[([^\]]*)\]\([^)]*\)/g, "$1"],
  [/^[ \t]{0,3}(?:[-*_][ \t]*){3,}$/gm, " "],
  [/^[ \t]{0,3}>+[ \t]?/gm, ""],
  [/^[ \t]{0,3}#{1,6}[ \t]+/gm, ""],
  [/^[ \t]{0,3}(?:[-*+]|\d+\.)[ \t]+/gm, ""],
  [/[`*_~]/g, ""],
];

export const stripMarkdown = (text: string) =>
  RULES.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    text,
  )
    .replace(/\s+/g, " ")
    .trim();

export function previewOf(text: string, max = PREVIEW_MAX_CHARS) {
  const stripped = stripMarkdown(text);
  if (stripped.length <= max) return stripped;
  return `${stripped.slice(0, max - 1).trimEnd()}…`;
}
