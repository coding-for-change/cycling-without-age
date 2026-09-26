"use client";

import { useCallback, type KeyboardEvent, type RefObject } from "react";
import {
  Bold,
  Code,
  Italic,
  Link2,
  List,
  Quote,
  Strikethrough,
  type LucideIcon,
} from "lucide-react";

export type ToolKey =
  "bold" | "italic" | "strike" | "code" | "link" | "list" | "quote";

export type MarkdownToolLabels = Record<ToolKey, string>;

export const TOOL_ICON: Record<ToolKey, LucideIcon> = {
  bold: Bold,
  italic: Italic,
  strike: Strikethrough,
  code: Code,
  link: Link2,
  list: List,
  quote: Quote,
};

export const TOOL_SHORTCUT: Partial<Record<ToolKey, string[]>> = {
  bold: ["⌘", "B"],
  italic: ["⌘", "I"],
  strike: ["⌘", "⇧", "X"],
};

const WRAP: Partial<Record<ToolKey, [string, string]>> = {
  bold: ["**", "**"],
  italic: ["_", "_"],
  strike: ["~~", "~~"],
  code: ["`", "`"],
};

const PREFIX: Partial<Record<ToolKey, string>> = {
  list: "- ",
  quote: "> ",
};

function select(element: HTMLTextAreaElement, from: number, to: number) {
  requestAnimationFrame(() => {
    element.focus();
    element.setSelectionRange(from, to);
  });
}

export function useMarkdownTools(
  field: RefObject<HTMLTextAreaElement | null>,
  value: string,
  change: (next: string) => void,
  linkLabel: string,
) {
  const run = useCallback(
    (tool: ToolKey) => {
      const element = field.current;
      if (!element) return;
      const start = element.selectionStart;
      const end = element.selectionEnd;

      const wrap = WRAP[tool];
      if (wrap) {
        const [open, close] = wrap;
        change(
          `${value.slice(0, start)}${open}${value.slice(start, end)}${close}${value.slice(end)}`,
        );
        return select(element, start + open.length, end + open.length);
      }

      const prefix = PREFIX[tool];
      if (prefix) {
        const from = value.lastIndexOf("\n", start - 1) + 1;
        const endOfLine = value.indexOf("\n", end);
        const to = endOfLine === -1 ? value.length : endOfLine;
        const block = value
          .slice(from, to)
          .split("\n")
          .map((line) => `${prefix}${line}`)
          .join("\n");
        change(`${value.slice(0, from)}${block}${value.slice(to)}`);
        return select(element, from + block.length, from + block.length);
      }

      const label = value.slice(start, end) || linkLabel;
      change(`${value.slice(0, start)}[${label}](https://)${value.slice(end)}`);
      const caret = start + label.length + 3 + "https://".length;
      select(element, caret, caret);
    },
    [field, value, change, linkLabel],
  );

  const shortcut = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return false;
      const key = event.key.toLowerCase();
      const tool: ToolKey | null =
        !event.shiftKey && key === "b"
          ? "bold"
          : !event.shiftKey && key === "i"
            ? "italic"
            : event.shiftKey && key === "x"
              ? "strike"
              : null;
      if (!tool) return false;
      event.preventDefault();
      run(tool);
      return true;
    },
    [run],
  );

  return { run, shortcut };
}
