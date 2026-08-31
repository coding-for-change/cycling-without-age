"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Character } from "@/components/character";

const HERO_ROUTES = new Set(["/welcome"]);
const ASIDE_ROUTES = new Set(["/location"]);

const STAGE_PX = 320;

export type CharacterPose = "hero" | "compact" | "away";

const PoseContext = createContext<
  ((pose: CharacterPose | null) => void) | null
>(null);

/**
 * Lets a screen override the pose the route would otherwise imply. The carousel
 * is the reason it exists: the character is slide one's artwork, so it has to
 * step aside once the person swipes on to a photograph. Pass `null` to hand
 * control back to the route.
 */
export function useSetCharacterPose() {
  const setPose = useContext(PoseContext);
  if (!setPose) {
    throw new Error("useSetCharacterPose must be used inside CharacterStage");
  }
  return setPose;
}

export function CharacterStage({
  pathname,
  children,
}: {
  pathname: string;
  children: ReactNode;
}) {
  const [override, setOverride] = useState<CharacterPose | null>(null);
  const setPose = useMemo(() => setOverride, []);
  const pose = override ?? (HERO_ROUTES.has(pathname) ? "hero" : "compact");

  return (
    <PoseContext.Provider value={setPose}>
      <div
        aria-hidden
        data-pose={pose}
        data-aside={ASIDE_ROUTES.has(pathname)}
        className="character-stage"
      >
        <Character
          size={STAGE_PX}
          className="text-mint"
        />
      </div>
      {children}
    </PoseContext.Provider>
  );
}
