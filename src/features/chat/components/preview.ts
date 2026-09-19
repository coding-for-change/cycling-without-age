const RULES: [RegExp, string][] = [
  [/```[\s\S]*?```/g, " "],
  [/`([^`]*)`/g, "$1"],
  [/!\[([^\]]*)\]\([^)]*\)/g, "$1"],
  [/\[([^\]]*)\]\([^)]*\)/g, "$1"],
  [/^\s{0,3}#{1,6}\s+/gm, ""],
  [/^\s{0,3}>\s?/gm, ""],
  [/^\s{0,3}[-*+]\s+/gm, ""],
  [/^\s{0,3}\d+[.)]\s+/gm, ""],
  [/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/gm, " "],
  [/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "$2"],
  [/(~~)(?=\S)([\s\S]*?\S)\1/g, "$2"],
  [/(\*|_)(?=\S)([^*_\n]*?\S)\1/g, "$2"],
  [/\\([\\`*_~[\]()#+\-.!>])/g, "$1"],
];

export const PREVIEW_LIMIT = 140;

export function stripPreview(
  text: string,
  limit: number = PREVIEW_LIMIT,
): string {
  let value = text;
  for (const [pattern, replacement] of RULES)
    value = value.replace(pattern, replacement);

  value = value.replace(/\s+/g, " ").trim();
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trimEnd()}…`;
}

export function previewLine(
  text: string,
  prefix: string | null,
  limit: number = PREVIEW_LIMIT,
): string {
  const body = stripPreview(text, limit);
  if (!prefix) return body;
  return body ? `${prefix}: ${body}` : prefix;
}
