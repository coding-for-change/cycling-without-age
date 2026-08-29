"use client";

/* localStorage-backed demo store with cross-tab sync + mock push notifications —
   the TS/zustand port of the vanilla mockup's CWA.store. All writes go through
   update(fn). The database only exists on the client; app shells render behind a
   mounted gate (see <AppBoot/>), so `db` is safe to read as non-null inside them. */

import { create } from "zustand";
import type { Database } from "./types";
import { seedDatabase, DB_VERSION } from "./seed";

export const DB_KEY = "cwa.db.v1";

function readRaw(): Database | null {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) || "null");
  } catch {
    return null;
  }
}

function load(): Database {
  let db = readRaw();
  if (!db || !db.meta || db.meta.version !== DB_VERSION) {
    db = seedDatabase();
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }
  return db;
}

interface StoreState {
  /** null until hydrated on the client (AppBoot gates rendering on this) */
  db: Database | null;
  hydrate: () => void;
  /** ALL writes go through here. Mutate the draft; it is persisted + broadcast. */
  update: (fn: (db: Database) => void) => void;
  reset: () => void;
}

export const useStore = create<StoreState>()((set, get) => ({
  db: null,
  hydrate: () => {
    if (!get().db) set({ db: load() });
  },
  update: (fn) => {
    const db = load();
    fn(db);
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    set({ db });
    window.dispatchEvent(new CustomEvent("cwa:change"));
  },
  reset: () => {
    localStorage.removeItem(DB_KEY);
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("cwa.seen.")) localStorage.removeItem(k);
    });
    location.reload();
  },
}));

/** Queue a mock push notification. Call INSIDE update(fn) with the db it gives you.
 * audience: 'admin' | 'pilot' | 'global' | 'client:<id>'
 * tKey must be a notif.* pair ('.t'/'.b' suffixed keys exist in the dictionary).
 * href = route on the RECEIVING app (e.g. '/pilot/rides/r-xyz'). */
export function notify(
  db: Database,
  audience: string,
  tKey: string,
  params: Record<string, string> = {},
  href = "",
) {
  db.meta.seq++;
  db.notifications.push({
    id: db.meta.seq,
    audience,
    tKey,
    params,
    hash: href,
    ts: Date.now(),
  });
  if (db.notifications.length > 60)
    db.notifications = db.notifications.slice(-60);
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function find<T extends { id: string }>(
  list: T[],
  id: string | null | undefined,
): T | undefined {
  if (!id) return undefined;
  return list.find((x) => x.id === id);
}

/* ------------------------------------------------------------------ watch --
   Cross-tab watching + push banners for an app's audience(s):
   - same-tab writes: re-render (zustand does that), no banner, advance watermark
   - other-tab writes (storage event): reload db → re-render + banner
   - page load: banner for anything unseen since the last visit               */

export interface WatchOpts {
  persona: string;
  icon?: string;
  appName?: string;
}

export type BannerFn = (n: {
  title: string;
  body: string;
  href: string;
  icon?: string;
  appName?: string;
}) => void;

export function startWatch(
  audiences: string[],
  opts: WatchOpts,
  showBanner: BannerFn,
  translate: (k: string, p?: Record<string, string>) => string,
) {
  const seenKey = `cwa.seen.${opts.persona}`;
  const maxId = (d: Database) =>
    d.notifications.reduce((m, n) => Math.max(m, n.id), 0);
  let seen = parseInt(localStorage.getItem(seenKey) || "", 10);
  // First-ever visit: baseline = seed watermark (seq starts at 100), so anything
  // that happened in other roles before this app was first opened still banners.
  if (isNaN(seen)) {
    seen = 100;
    localStorage.setItem(seenKey, String(seen));
  }

  function flush() {
    const d = load();
    const fresh = d.notifications.filter(
      (n) => n.id > seen && audiences.includes(n.audience),
    );
    seen = maxId(d);
    localStorage.setItem(seenKey, String(seen));
    fresh.slice(-2).forEach((n) => {
      showBanner({
        title: translate(`${n.tKey}.t`, n.params),
        body: translate(`${n.tKey}.b`, n.params),
        href: n.hash,
        icon: opts.icon,
        appName: opts.appName,
      });
    });
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key !== DB_KEY) return;
    useStore.setState({ db: load() });
    flush();
  };
  const onOwnChange = () => {
    seen = maxId(load());
    localStorage.setItem(seenKey, String(seen));
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("cwa:change", onOwnChange);
  const timer = setTimeout(flush, 900); // unseen-since-last-visit banners on load

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("cwa:change", onOwnChange);
    clearTimeout(timer);
  };
}
