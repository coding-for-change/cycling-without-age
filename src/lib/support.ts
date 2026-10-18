/**
 * Where passengers report a problem. A placeholder until CWA names a real
 * inbox: `.example` is reserved (RFC 2606), so nothing is ever delivered.
 */
export const PROBLEM_EMAIL = "problem@cwa.example";

export const problemMailto = (subject: string, body: string) =>
  `mailto:${PROBLEM_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
