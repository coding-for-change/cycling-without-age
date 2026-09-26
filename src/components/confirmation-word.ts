const NAME_LENGTH = 40;

const normalize = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

const shorten = (name: string) => {
  const parts = normalize(name).split("-").filter(Boolean);
  let kept = parts[0]?.slice(0, NAME_LENGTH) ?? "";
  for (const part of parts.slice(1)) {
    const next = `${kept}-${part}`;
    if (next.length > NAME_LENGTH) break;
    kept = next;
  }
  return kept;
};

export const confirmationWord = (word: string, name: string) => {
  const suffix = shorten(name);
  return suffix ? `${normalize(word)}-${suffix}` : normalize(word);
};

export const matchesConfirmationWord = (typed: string, word: string) =>
  normalize(typed) === word;
