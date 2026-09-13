export const signInHref = (next: string) =>
  `/sign-in?next=${encodeURIComponent(next)}`;
