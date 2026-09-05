import { useEffect, useSyncExternalStore } from "react";
import { z, type ZodType } from "zod";

export const DRAFT_KEY = "cwa.draft";
export const DRAFT_VERSION = 1;
export const DRAFT_MAX_AGE_MS = 60 * 60 * 1000;

const envelope = z.object({
  v: z.literal(DRAFT_VERSION),
  kind: z.string(),
  payload: z.unknown(),
  createdAt: z.number(),
});

let cached: string | null = null;
let restored = false;

export function saveDraft(kind: string, payload: unknown) {
  const raw = JSON.stringify({
    v: DRAFT_VERSION,
    kind,
    payload,
    createdAt: Date.now(),
  });
  cached = raw;
  restored = true;
  try {
    sessionStorage.setItem(DRAFT_KEY, raw);
  } catch {}
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function readDraft<T>(
  raw: string | null | undefined,
  kind: string,
  schema: ZodType<T>,
  now: number = Date.now(),
): T | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const outer = envelope.safeParse(parsed);
  if (!outer.success) return null;
  if (outer.data.kind !== kind) return null;
  if (now - outer.data.createdAt > DRAFT_MAX_AGE_MS) return null;

  const inner = schema.safeParse(outer.data.payload);
  return inner.success ? inner.data : null;
}

// ponytail: nothing writes the draft while a reader is mounted — the CTA saves
// and navigates away — so `subscribe` never has to notify and the module keeps
// the value it read, which is what stops `clearDraft` blanking the screen it
// just filled. Give it a real listener set if a screen ever does both at once.
const subscribe = () => () => {};
const serverSnapshot = () => null;

function snapshot(): string | null {
  if (!restored) {
    restored = true;
    try {
      cached = sessionStorage.getItem(DRAFT_KEY);
    } catch {}
  }
  return cached;
}

export function useDraft<T>(kind: string, schema: ZodType<T>): T | null {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  useEffect(clearDraft, []);
  return readDraft(raw, kind, schema);
}

export const signInHref = (next: string) =>
  `/sign-in?next=${encodeURIComponent(next)}`;
