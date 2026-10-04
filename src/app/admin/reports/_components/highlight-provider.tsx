"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type HighlightKey = `chapter:${string}` | `country:${string}`;

type HighlightContext = {
  highlighted: HighlightKey | null;
  highlight: (key: HighlightKey | null) => void;
};

const Context = createContext<HighlightContext>({
  highlighted: null,
  highlight: () => {},
});

export function HighlightProvider({ children }: { children: ReactNode }) {
  const [highlighted, highlight] = useState<HighlightKey | null>(null);
  const value = useMemo(() => ({ highlighted, highlight }), [highlighted]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useHighlight = () => useContext(Context);

export const chapterKey = (id: string): HighlightKey => `chapter:${id}`;
export const countryKey = (code: string): HighlightKey => `country:${code}`;

export const isChapterHighlighted = (
  highlighted: HighlightKey | null,
  chapter: { id: string; countryCode: string },
) =>
  highlighted === chapterKey(chapter.id) ||
  highlighted === countryKey(chapter.countryCode);

export function hoverProps(
  key: HighlightKey,
  highlight: HighlightContext["highlight"],
) {
  return {
    onPointerEnter: () => highlight(key),
    onPointerLeave: () => highlight(null),
    onFocus: () => highlight(key),
    onBlur: () => highlight(null),
  };
}
