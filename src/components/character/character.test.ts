import { BotEngine } from "./bloub/engine";
import { EXPRESSION_BY_ID } from "./bloub/expressions";
import { eyePoses } from "./bloub/face";
import { RAYON } from "./bloub/repere";
import { STATE_BY_ID } from "./bloub/states";
import { lookAt } from "./gaze";

/**
 * The whole component rests on one invariant: frame 0 of a fresh engine is a
 * settled, deterministic pose. That is what lets the server render it and the
 * client hydrate onto the same markup without a mismatch. If upstream ever
 * gives `idle` an entry animation, this test fails and the SSR frame has to go.
 */
const fresh = () =>
  new BotEngine(RAYON, "idle", null, EXPRESSION_BY_ID.get("neutre")!);

describe("character SSR frame", () => {
  it("is fully settled at t=0", () => {
    const frame = fresh().sample(0);

    expect(frame.bodyAlpha).toBe(1);
    for (const eye of frame.eyes) expect(eye.alpha).toBe(1);
    expect(frame.dots).toHaveLength(0);
    expect(frame.arcs).toHaveLength(0);
  });

  it("is identical across independently constructed engines", () => {
    expect(fresh().sample(0).bodyPath).toBe(fresh().sample(0).bodyPath);
  });
});

describe("gaze", () => {
  /**
   * The whole point of `lookAt`: its two angles have to invert the engine's
   * yaw-then-pitch order, so the forward direction it produces is PARALLEL to
   * the offset it was given. Read the eye at split 0 — that is the forward
   * direction itself — and it must sit on the line to the cursor.
   */
  it("points the eyes at the cursor", () => {
    const [dx, dy, width] = [-420, 180, 1500];
    const [eye] = eyePoses({ ...lookAt(dx, dy, width), roll: -13 }, 1, 0);

    expect(eye.x / eye.y).toBeCloseTo(dx / dy, 6);
    expect(eye.depth).toBeGreaterThan(0);
  });

  it("stops at the edge of the face instead of following forever", () => {
    expect(lookAt(-4000, 0, 1500).yaw).toBe(-42);
    expect(lookAt(0, 4000, 1500).pitch).toBe(-30);
  });
});

/**
 * `oops()` holds `exclaim` for three seconds on every error path. What has to
 * survive an upstream bump is the shape itself: a faceless "!" that relaxes back
 * into the ball. If the state ever grows a `minDuration` past the hold, the
 * glyph gets cut off mid-morph instead of returning.
 */
describe("the error pose", () => {
  const OOPS_S = 3;

  it("runs to completion inside the hold", () => {
    expect(STATE_BY_ID.get("exclaim")!.minDuration ?? 0).toBeLessThan(OOPS_S);
  });

  it("is a faceless glyph with a single tittle, then the ball again", () => {
    const engine = fresh();
    engine.setState("exclaim", 0);
    const mid = engine.sample(1.5);
    expect(mid.eyes.every((eye) => eye.alpha === 0)).toBe(true);
    expect(mid.dots).toHaveLength(1);

    engine.setState("idle", OOPS_S);
    const after = engine.sample(OOPS_S + 1);
    expect(after.dots).toHaveLength(0);
    for (const eye of after.eyes) expect(eye.alpha).toBe(1);
  });
});
