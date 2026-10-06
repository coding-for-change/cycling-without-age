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

export const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`.trim();

export const pick = <T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
) => Object.fromEntries(keys.map((key) => [key, source[key]])) as Pick<T, K>;
