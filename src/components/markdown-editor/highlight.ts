export type HighlightTokenType =
  "text" | "bold" | "italic" | "strike" | "code" | "link";

export type HighlightToken = { type: HighlightTokenType; value: string };

type Delimiter = {
  open: string;
  close: string;
  type: HighlightTokenType;
  wordBounded: boolean;
};

const DELIMITERS: Delimiter[] = [
  { open: "`", close: "`", type: "code", wordBounded: false },
  { open: "**", close: "**", type: "bold", wordBounded: false },
  { open: "~~", close: "~~", type: "strike", wordBounded: false },
  { open: "*", close: "*", type: "italic", wordBounded: false },
  { open: "_", close: "_", type: "italic", wordBounded: true },
];

const URL_AT = /^https?:\/\/[^\s]+/;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

const isSpace = (char: string | undefined) =>
  char === undefined || /\s/.test(char);

const isWord = (char: string | undefined) =>
  char !== undefined && /[\p{L}\p{N}_]/u.test(char);

function matchUrl(text: string, at: number): string | null {
  if (text[at] !== "h") return null;
  if (isWord(text[at - 1])) return null;
  const found = URL_AT.exec(text.slice(at));
  if (!found) return null;
  const value = found[0].replace(TRAILING_PUNCTUATION, "");
  return value.length > "https://".length ? value : null;
}

function matchDelimited(text: string, at: number): HighlightToken | null {
  for (const delimiter of DELIMITERS) {
    if (!text.startsWith(delimiter.open, at)) continue;
    if (delimiter.wordBounded && isWord(text[at - 1])) continue;

    const contentStart = at + delimiter.open.length;
    if (isSpace(text[contentStart])) continue;

    let cursor = contentStart + 1;
    while (cursor <= text.length - delimiter.close.length) {
      const char = text[cursor];
      if (char === "\n") break;
      if (
        text.startsWith(delimiter.close, cursor) &&
        !isSpace(text[cursor - 1])
      ) {
        const after = cursor + delimiter.close.length;
        if (delimiter.wordBounded && isWord(text[after])) {
          cursor += 1;
          continue;
        }
        return { type: delimiter.type, value: text.slice(at, after) };
      }
      cursor += 1;
    }
  }
  return null;
}

export function tokenize(text: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let plain = "";
  let at = 0;

  const flush = () => {
    if (!plain) return;
    tokens.push({ type: "text", value: plain });
    plain = "";
  };

  while (at < text.length) {
    const url = matchUrl(text, at);
    if (url) {
      flush();
      tokens.push({ type: "link", value: url });
      at += url.length;
      continue;
    }

    const span = matchDelimited(text, at);
    if (span) {
      flush();
      tokens.push(span);
      at += span.value.length;
      continue;
    }

    plain += text[at];
    at += 1;
  }

  flush();
  return tokens;
}

export const HIGHLIGHT_CLASS: Record<HighlightTokenType, string> = {
  text: "",
  bold: "font-semibold",
  italic: "italic",
  strike: "line-through",
  code: "rounded bg-canvas-deep px-0.5 font-mono",
  link: "underline",
};
