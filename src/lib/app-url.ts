export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.BETTER_AUTH_URL ??
  "http://localhost:3000"
).replace(/\/+$/, "");

export const joinUrl = (slug: string) => `${APP_URL}/join/${slug}`;
