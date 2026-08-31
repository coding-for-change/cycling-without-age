"use client";

import { useContext, useEffect, useId, useRef, useState } from "react";

import { BotEngine, type BotFrame } from "./bloub/engine";
import { EXPRESSION_BY_ID, type ExpressionId } from "./bloub/expressions";
import { clamp, easings } from "./bloub/math";
import { cn } from "@/lib/utils";
import { DEMI_VIEWBOX, RAYON } from "./bloub/repere";
import { CharacterContext } from "./character-provider";
import { lookAt, RESTING, type Aim } from "./gaze";

/**
 * React rewrite of upstream `src/components/BloubBot.vue`
 * (github.com/jeremy-prt/bloub, MIT). The engine under `./bloub` is vendored
 * verbatim; only the view is ours. Kept close to the upstream template on
 * purpose, so the two stay diffable.
 */

const SPIN = 360;
const TURN_TIME = 1.1;

const lookTarget = (aim: Aim, tour: number, live: boolean) => ({
  ...aim,
  mix: tour,
  spin: SPIN * (1 - tour),
  // no target: the head keeps living instead of fixing a dead point
  wander: live ? 0 : 1,
});

const REDUCED = "(prefers-reduced-motion: reduce)";

type CharacterProps = {
  size?: number;
  expression?: ExpressionId;
  follow?: boolean;
  onTap?: () => void;
  className?: string;
};

export function Character({
  size = 320,
  expression,
  follow = true,
  onTap,
  className,
}: CharacterProps) {
  const ctx = useContext(CharacterContext);
  const mood = expression ?? ctx?.mood ?? "neutre";
  const state = ctx?.state ?? "idle";
  // The "!" is only ever played by `oops()`, so the state doubles as the signal
  // to switch to the brand red — the one place errors are allowed to use it.
  const alarmed = state === "exclaim";
  const tap = onTap ?? ctx?.tap;

  const [engine] = useState(
    () =>
      new BotEngine(RAYON, "idle", null, EXPRESSION_BY_ID.get(mood) ?? null),
  );
  /**
   * The server renders frame 0 and hydration matches it: for `idle` the pose is
   * `base()`, so there are no dots, no arcs and no notif, `eyeAlpha` and
   * `breath` saturate to exactly 1, and every coordinate goes through the
   * engine's 2-decimal rounding.
   */
  const [frame, setFrame] = useState<BotFrame>(() => engine.sample(0));

  const svg = useRef<SVGSVGElement>(null);
  const clock = useRef(0);

  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const maskId = `character-mask-${uid}`;

  useEffect(() => {
    if (window.matchMedia(REDUCED).matches) return;

    let raf = 0;
    let last = 0;
    /** last known pointer position, in client coordinates */
    let pointer: { x: number; y: number } | null = null;
    /** focused element, so the gaze follows the field being typed into */
    let focused: Element | null = null;
    let aiming = false;
    let turnSince = 0;

    const onPointerMove = (event: PointerEvent) => {
      // A lifted finger leaves no cursor behind: following it would freeze the
      // gaze on the last touched point, which reads as a bug.
      if (event.pointerType === "touch") return;
      focused = null;
      pointer = { x: event.clientX, y: event.clientY };
    };
    const onPointerLeave = () => {
      pointer = null;
    };
    const onFocusIn = () => {
      focused = document.activeElement;
    };
    const onFocusOut = () => {
      focused = null;
    };

    const centreOf = (el: Element | null) => {
      if (!el || el === document.body || el === document.documentElement) {
        return null;
      }
      if (svg.current?.contains(el)) return null;
      const b = el.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) return null;
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    };

    /**
     * Only the DOM half of the work — where the character is and where to look.
     *
     * The rect is re-read every frame rather than cached: the character slides
     * and scales during placement transitions, so a cached centre would aim
     * beside itself for the whole move. The offset goes to the box centre, which
     * is also the ball's centre — the viewBox is centred on the origin.
     */
    const aim = (now: number) => {
      const box = svg.current?.getBoundingClientRect();
      /*
       * A box with no area reports its position as 0,0 — a hidden tab really
       * does — and the offset below would then be measured from the top-left
       * corner of the window instead of from the character. Nothing to aim at.
       */
      if (!box || box.width === 0 || box.height === 0) return;

      const target = centreOf(focused) ?? pointer;
      if (!aiming) turnSince = now;

      engine.setLook(
        lookTarget(
          target
            ? lookAt(
                target.x - (box.left + box.width / 2),
                target.y - (box.top + box.height / 2),
                window.innerWidth,
              )
            : RESTING,
          easings.easeOutQuint(clamp((now - turnSince) / TURN_TIME)),
          target !== null,
        ),
        now,
      );
      aiming = true;
    };

    const tick = (ms: number) => {
      raf = requestAnimationFrame(tick);
      // Bounded delta: a tab hidden then shown again resumes without jumping
      // forward, since rAF is suspended while it is hidden.
      const dt = last ? Math.min((ms - last) / 1000, 0.064) : 0;
      last = ms;
      clock.current += dt;
      if (follow) aim(clock.current);
      setFrame(engine.sample(clock.current));
    };

    if (follow) {
      window.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerleave", onPointerLeave);
      document.addEventListener("focusin", onFocusIn);
      document.addEventListener("focusout", onFocusOut);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [engine, follow]);

  // Dated setter, same contract as the expression below: the engine morphs out
  // of whatever it is playing at `now`, so nothing here restarts a running state.
  useEffect(() => {
    engine.setState(state, clock.current);
  }, [engine, state]);

  useEffect(() => {
    // Dated setter: the engine morphs from the mood it is on at `now`. Never
    // assign to its fields.
    engine.setExpression(EXPRESSION_BY_ID.get(mood) ?? null, clock.current);
    if (!window.matchMedia(REDUCED).matches) return;
    // No loop to consume the morph, so land its end state in one frame.
    const raf = requestAnimationFrame(() =>
      setFrame(engine.sample(clock.current + 1)),
    );
    return () => cancelAnimationFrame(raf);
  }, [engine, mood]);

  return (
    <svg
      ref={svg}
      width={size}
      height={size}
      viewBox={`${-DEMI_VIEWBOX} ${-DEMI_VIEWBOX} ${DEMI_VIEWBOX * 2} ${DEMI_VIEWBOX * 2}`}
      className={cn(
        "transition-colors duration-300",
        className,
        alarmed && "text-red",
      )}
      // The body is a full-viewBox rect clipped by a mask, and a mask does not
      // affect hit-testing — so without this the character's transparent square
      // corners would swallow taps meant for the page underneath it. Pointer
      // events come back on the silhouette-shaped target at the end instead.
      pointerEvents="none"
      // Belt and braces with aria-hidden: the tap target at the end is a
      // decorative easter egg, and nothing here is an object worth announcing.
      // Deliberately no `cursor: pointer` either — it makes tooling treat the
      // mascot as a control and surface it as an unnamed image.
      role="presentation"
      aria-hidden
    >
      <defs>
        {/*
          The eyes are real holes punched through the body, not white shapes
          laid on top: they are therefore clipped by the silhouette on their
          own as they slide toward the edge. `white`/`black` here are mask
          stencil values (keep / punch), not colours.
        */}
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={-DEMI_VIEWBOX}
          y={-DEMI_VIEWBOX}
          width={DEMI_VIEWBOX * 2}
          height={DEMI_VIEWBOX * 2}
        >
          <path
            d={frame.bodyPath}
            fill="white"
          />
          {frame.eyes.map((eye, i) => (
            <path
              key={i}
              d={eye.d}
              transform={eye.matrix}
              opacity={eye.alpha}
              fill="black"
            />
          ))}
          {frame.notch && (
            <circle
              cx={frame.notch.x}
              cy={frame.notch.y}
              r={frame.notch.r}
              fill="black"
            />
          )}
        </mask>

        {frame.arcs.map((arc) => (
          <linearGradient
            key={arc.id}
            id={`${uid}-${arc.id}`}
            gradientUnits="userSpaceOnUse"
            x1={arc.grad.x1}
            y1={arc.grad.y1}
            x2={arc.grad.x2}
            y2={arc.grad.y2}
          >
            {arc.grad.stops.map((c, i) => (
              <stop
                key={i}
                offset={i / (arc.grad.stops.length - 1)}
                stopColor={c}
              />
            ))}
          </linearGradient>
        ))}
      </defs>

      {/* back half of the orbits: drawn before the body, so it is occluded */}
      <g
        fill="none"
        strokeLinecap="round"
      >
        {frame.arcs.map((arc) => (
          <path
            key={arc.id}
            d={arc.back}
            stroke={`url(#${uid}-${arc.id})`}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>

      {frame.dotsBehind && <Dots dots={frame.dots} />}

      {/* Upstream's `paper` backdrop: a body-shaped patch of page, so the back
          half of the orbit rings and the burst particles do not show through
          the eye holes. Only when there IS something behind to hide — at rest
          the holes must stay the page itself, whatever it is. */}
      {(frame.arcs.length > 0 || frame.dotsBehind) && (
        <path
          d={frame.bodyPath}
          fill="var(--canvas)"
          opacity={frame.bodyAlpha}
        />
      )}

      <g opacity={frame.bodyAlpha}>
        <g mask={`url(#${maskId})`}>
          <rect
            x={-DEMI_VIEWBOX}
            y={-DEMI_VIEWBOX}
            width={DEMI_VIEWBOX * 2}
            height={DEMI_VIEWBOX * 2}
            fill="currentColor"
          />
        </g>
      </g>

      {!frame.dotsBehind && <Dots dots={frame.dots} />}

      {/* front half of the orbits */}
      <g
        fill="none"
        strokeLinecap="round"
      >
        {frame.arcs.map((arc) => (
          <path
            key={arc.id}
            d={arc.front}
            stroke={`url(#${uid}-${arc.id})`}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>

      {/* The tap target, shaped like the character rather than like its box.
          `fill="none"` with `pointerEvents="all"` hit-tests the fill geometry
          without painting it. */}
      <path
        d={frame.bodyPath}
        fill="none"
        pointerEvents={tap ? "all" : "none"}
        onClick={tap}
      />
    </svg>
  );
}

/**
 * A dot is a plain disc, unless the state hands it a shape (the tilted "!"
 * drop): the path is then in ball-radius units centred on the origin, so it is
 * placed with translate/rotate/scale.
 */
function Dots({ dots }: { dots: BotFrame["dots"] }) {
  return (
    <g>
      {dots.map((dot, i) =>
        dot.d ? (
          <path
            key={i}
            d={dot.d}
            fill={dot.color ?? "currentColor"}
            opacity={dot.opacity}
            transform={`translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${RAYON})`}
          />
        ) : (
          <circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r={dot.r}
            fill={dot.color ?? "currentColor"}
            opacity={dot.opacity}
          />
        ),
      )}
    </g>
  );
}
