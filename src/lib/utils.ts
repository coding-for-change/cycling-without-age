import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string) {
  return name
    .split(/[\s]+/)
    .map((part) => part.match(/[\p{L}\p{N}]/u)?.[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0];

/** "Pernille Marie Holm" → Pernille Marie · Holm: the last word is the surname. */
export const splitName = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length > 1
    ? { firstName: words.slice(0, -1).join(" "), lastName: words.at(-1)! }
    : { firstName: words[0] ?? "", lastName: "" };
};

export const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`.trim();

/**
 * The two parts of an account's name: the rider row's while they still add up
 * to the account name, else the account name split — so a rename elsewhere
 * (the account sheet) is never put back from a stale row.
 */
export const nameParts = (
  name: string,
  row: { firstName: string; lastName: string } | null,
) =>
  row && fullName(row) === name.trim()
    ? { firstName: row.firstName, lastName: row.lastName }
    : splitName(name);

export const pick = <T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
) => Object.fromEntries(keys.map((key) => [key, source[key]])) as Pick<T, K>;
