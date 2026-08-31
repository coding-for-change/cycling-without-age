"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

import { haptics } from "@/lib/native/haptics";

import type { ExpressionId } from "./bloub/expressions";
import { STATE_BY_ID, type StateId } from "./bloub/states";

/**
 * Moods the character cycles through on a tap. Upstream's list, and the reason
 * is geometric: every one of them has a ROLL of zero, so hopping between them
 * never tilts the head — only the eye shape changes. Adding one with a roll
 * (`curieux`, -15deg) brings back the vertical jump.
 */
const MOODS: ExpressionId[] = [
  "surpris",
  "heureux",
  "hilare",
  "excite",
  "fier",
  "blase",
];

const HOLD_MS = 2200;
const OOPS_MS = 3000;

export type CharacterApi = {
  /** Put the character in `mood`, then let it drift back to neutral. */
  say: (mood: ExpressionId, holdMs?: number) => void;
  /**
   * Play a whole-body animation once, then settle back to idle. `holdMs`
   * overrides how long it runs before it settles; the default is the state's own
   * `duration` in `bloub/states.ts`, which is also where its choreography (ring
   * fades, when a shape relaxes) is timed.
   */
  play: (state: StateId, holdMs?: number) => void;
  /**
   * Every failed action: the body morphs into an exclamation mark and turns red
   * for three seconds. `exclaim` carries no face, so a `say(...)` fired beside it
   * is invisible until the shape relaxes — which is what makes it the fallback
   * when reduced motion has skipped the morph entirely.
   */
  oops: () => void;
};

type CharacterCtx = CharacterApi & {
  mood: ExpressionId;
  state: StateId;
  tap: () => void;
};

export const CharacterContext = createContext<CharacterCtx | null>(null);

export function useCharacter(): CharacterApi {
  const ctx = useContext(CharacterContext);
  if (!ctx) {
    throw new Error("useCharacter must be used inside <CharacterProvider>");
  }
  return ctx;
}

export function CharacterProvider({ children }: { children: React.ReactNode }) {
  const [mood, setMood] = useState<ExpressionId>("neutre");
  const [state, setState] = useState<StateId>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hold = (next: ExpressionId, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    setMood(next);
    timer.current = setTimeout(() => setMood("neutre"), ms);
  };

  const play = (next: StateId, holdMs?: number) => {
    // The whole point of these states is the movement; with motion turned
    // down there is nothing left to show, only a silhouette that jumps.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (stateTimer.current) clearTimeout(stateTimer.current);
    setState(next);
    stateTimer.current = setTimeout(
      () => setState("idle"),
      holdMs ?? STATE_BY_ID.get(next)!.duration * 1000,
    );
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (stateTimer.current) clearTimeout(stateTimer.current);
    },
    [],
  );

  return (
    <CharacterContext.Provider
      value={{
        mood,
        state,
        // No haptic here: at most one per user action (AGENTS.md §7), and the
        // component that calls `say` already fires one next to its own message.
        say: (next, holdMs = HOLD_MS) => hold(next, holdMs),
        play,
        oops: () => play("exclaim", OOPS_MS),
        tap: () => {
          haptics.tap();
          hold(MOODS[Math.floor(Math.random() * MOODS.length)], HOLD_MS);
        },
      }}
    >
      {children}
    </CharacterContext.Provider>
  );
}
