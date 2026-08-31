import { clamp } from "./bloub/math";

/**
 * Where the eyes point, replacing upstream `src/ui/gaze.ts`. Upstream leans: a
 * flat 26deg (`TURN`) toward bloub's own left-hand panel plus +-16deg of cursor,
 * so the eyes drift the right way without ever arriving. Here the cursor is a
 * point in a plane `DEPTH` windows in front of the ball and the head aims AT it.
 *
 * The two angles invert the engine's yaw-then-pitch Euler order exactly (see
 * `eyePoses`), so the forward direction comes out parallel to the offset and the
 * eyes land ON the line to the cursor — that is what the test pins.
 *
 * `DEPTH` is fitted to upstream's own extreme: the far side of the window lands
 * at 42deg, where `TURN + YAW_MAX` put it, and 0.84 of the way to the silhouette
 * edge is as far as the inner eye goes before the mask starts eating it.
 */
const DEPTH = 0.7;
const YAW_MAX = 42;
/** Binds on a phone, where a focused field sits most of a screen below the
 *  corner-tucked character and the eyes would otherwise slide off the chin. */
const PITCH_MAX = 30;

export type Aim = { yaw: number; pitch: number };

/** Where the head rests when there is nothing to look at. */
export const RESTING: Aim = { yaw: 0, pitch: 10 };

const degrees = (rad: number) => (rad * 180) / Math.PI;

/**
 * `dx`/`dy`: pixels from the ball's centre to the cursor. In pixels and not as a
 * fraction of the character's box, because how far the eyes turn is a property
 * of the screen, not of how big the mascot happens to be drawn.
 */
export function lookAt(dx: number, dy: number, windowWidth: number): Aim {
  const depth = DEPTH * Math.max(1, windowWidth);
  return {
    yaw: clamp(degrees(Math.atan2(dx, depth)), -YAW_MAX, YAW_MAX),
    // positive pitch looks up, while the screen's y axis grows downward
    pitch: clamp(
      degrees(Math.atan2(-dy, Math.hypot(dx, depth))),
      -PITCH_MAX,
      PITCH_MAX,
    ),
  };
}
