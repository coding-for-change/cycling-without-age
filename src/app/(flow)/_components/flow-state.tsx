"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Channel = "email" | "phone";
export type FlowRole = "pilot" | "passenger";

export type FlowState = {
  channel: Channel | null;
  /** Normalised: a lowercased email, or a phone number in E.164. */
  identifier: string | null;
  /** What the person actually typed, so a screen can echo it back to them. */
  display: string | null;
  /** ISO 3166-1 alpha-2, only meaningful on the phone path. */
  country: string | null;
  role: FlowRole | null;
};

const EMPTY: FlowState = {
  channel: null,
  identifier: null,
  display: null,
  country: null,
  role: null,
};

const KEY = "cwa.flow";

let state: FlowState = EMPTY;
let restored = false;
const listeners = new Set<() => void>();

function snapshot(): FlowState {
  if (!restored) {
    restored = true;
    try {
      const stored = sessionStorage.getItem(KEY);
      if (stored) state = { ...EMPTY, ...JSON.parse(stored) };
    } catch {
      // Private mode, or a shape we no longer understand. Start clean.
    }
  }
  return state;
}

const serverSnapshot = () => EMPTY;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commit(next: FlowState) {
  state = next;
  restored = true;
  listeners.forEach((listener) => listener());
}

type FlowContext = {
  flow: FlowState;
  update: (patch: Partial<FlowState>) => void;
  reset: () => void;
};

const Context = createContext<FlowContext | null>(null);

/**
 * Carries the half-finished identity between steps. It deliberately never
 * touches the URL — an email address or phone number in a query string ends up
 * in browser history, in referrers and in server logs.
 *
 * Mirrored into sessionStorage so a reload mid-flow resumes instead of dead-
 * ending, and cleared the moment the flow completes.
 */
export function FlowStateProvider({ children }: { children: ReactNode }) {
  const flow = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const update = useCallback((patch: Partial<FlowState>) => {
    const next = { ...snapshot(), ...patch };
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    commit(next);
  }, []);

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
    commit(EMPTY);
  }, []);

  const value = useMemo(() => ({ flow, update, reset }), [flow, update, reset]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useFlow() {
  const context = useContext(Context);
  if (!context)
    throw new Error("useFlow must be used inside FlowStateProvider");
  return context;
}
