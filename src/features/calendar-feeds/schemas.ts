import { z } from "zod";

/**
 * The route's file segment, `<token>.ics`. Only the suffix is checked here —
 * whether the token is genuine is `openFeed`'s question, answered by its
 * signature before any row is read.
 */
export const feedFileName = z
  .string()
  .max(64)
  .endsWith(".ics")
  .transform((file) => file.slice(0, -".ics".length));
