const INVISIBLE = "[\\u200B-\\u200F\\u2060-\\u2064\\uFEFF]*";

export const exact = (text: string) =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${INVISIBLE}$`);
