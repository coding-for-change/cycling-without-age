"use client";

import {
  Suspense,
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Character } from "@/components/character";

const AWAY_ROUTES = new Set(["/welcome"]);
const ASIDE_ROUTES = new Set(["/location"]);

const STAGE_PX = 320;

export type CharacterPose = "compact" | "away";

const PoseContext = createContext<
  ((pose: CharacterPose | null) => void) | null
>(null);

export function useSetCharacterPose() {
  const setPose = useContext(PoseContext);
  if (!setPose) {
    throw new Error("useSetCharacterPose must be used inside CharacterStage");
  }
  return setPose;
}

export function CharacterStage({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<CharacterPose | null>(null);

  return (
    <PoseContext.Provider value={setOverride}>
      <Suspense
        fallback={
          <Stage
            pose={override ?? "compact"}
            aside={false}
          />
        }
      >
        <RoutedStage override={override} />
      </Suspense>
      {children}
    </PoseContext.Provider>
  );
}

function RoutedStage({ override }: { override: CharacterPose | null }) {
  const pathname = usePathname();
  return (
    <Stage
      pose={override ?? (AWAY_ROUTES.has(pathname) ? "away" : "compact")}
      aside={ASIDE_ROUTES.has(pathname)}
    />
  );
}

function Stage({ pose, aside }: { pose: CharacterPose; aside: boolean }) {
  return (
    <div
      aria-hidden
      data-pose={pose}
      data-aside={aside}
      className="character-stage"
    >
      <Character
        size={STAGE_PX}
        className="text-mint"
      />
    </div>
  );
}
