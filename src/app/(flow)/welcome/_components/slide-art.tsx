"use client";

/*
 * Ported from the mockup's illustration system
 * (CyclingWithoutAge-mockup/mockup/js/art.js, the `trishaw` and `hands` heroes)
 * and recoloured onto the brand tokens: the mockup carries a six-hue palette,
 * and this app is ink, white, mint and red. Geometry and motion are the
 * mockup's; every fill is a `var(--token)` so nothing hardcodes a hex.
 *
 * Heroes are 360x260. Animation classes live in globals.css and all stop under
 * `prefers-reduced-motion`.
 */

function Hero({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 360 260"
      fill="none"
      role="presentation"
      aria-hidden
      className="mx-auto h-full w-full max-w-md"
      preserveAspectRatio="xMidYMid meet"
    >
      {children}
    </svg>
  );
}

function Person({
  x,
  y,
  s,
  cloth,
  hairLong,
  bald,
}: {
  x: number;
  y: number;
  s: number;
  cloth: string;
  hairLong?: boolean;
  bald?: boolean;
}) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path
        d="M-16 30c0-11 7-19 16-19s16 8 16 19Z"
        fill={cloth}
      />
      <circle
        cx="0"
        cy="0"
        r="12"
        fill="var(--canvas)"
      />
      <path
        d={
          bald
            ? "M-12-1a12 12 0 0 1 24 0c0-9-5-13-12-13S-12-10-12-1Z"
            : "M-12-2c0-9 5-14 12-14s12 5 12 14c0-4-4-6-12-6s-12 2-12 6Z"
        }
        fill="var(--ink)"
        opacity=".45"
      />
      {hairLong && (
        <>
          <path
            d="M-12-2c-4 8-4 16-2 22 3-6 4-12 3-18Z"
            fill="var(--ink)"
            opacity=".45"
          />
          <path
            d="M12-2c4 8 4 16 2 22-3-6-4-12-3-18Z"
            fill="var(--ink)"
            opacity=".45"
          />
        </>
      )}
      <circle
        cx="-4.5"
        cy="1"
        r="1.6"
        fill="var(--ink)"
      />
      <circle
        cx="4.5"
        cy="1"
        r="1.6"
        fill="var(--ink)"
      />
      <path
        d="M-4 6q4 4 8 0"
        stroke="var(--ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </g>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g
      className="art-float"
      transform={`translate(${x},${y}) scale(${s})`}
    >
      <path
        d="M0 12a12 12 0 0 1 12-12 14 14 0 0 1 12 7 10 10 0 0 1 14 5 8 8 0 0 1-6 12H8A9 9 0 0 1 0 12Z"
        fill="var(--canvas)"
      />
    </g>
  );
}

function Tree({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect
        x="-4"
        y="-26"
        width="8"
        height="30"
        rx="4"
        fill="var(--ink)"
        opacity=".55"
      />
      <circle
        cx="0"
        cy="-42"
        r="24"
        fill="var(--mint)"
      />
    </g>
  );
}

/** The money shot: a ride in progress. Side view, facing left. */
export function TrishawArt() {
  return (
    <Hero>
      <Cloud
        x={48}
        y={44}
        s={1.2}
      />
      <Cloud
        x={196}
        y={26}
        s={0.85}
      />
      <path
        d="M-20 214q110-26 200-8t200-10v70H-20Z"
        fill="var(--mint-tint)"
      />
      <Tree
        x={22}
        y={218}
        s={0.6}
      />
      <Tree
        x={332}
        y={220}
        s={0.58}
      />
      <g
        stroke="var(--ink)"
        strokeWidth="4"
        strokeLinecap="round"
        opacity=".3"
      >
        <path
          d="M238 118h34"
          className="art-dash"
        />
        <path
          d="M248 132h24"
          className="art-dash"
          style={{ animationDelay: ".2s" }}
        />
        <path
          d="M242 146h30"
          className="art-dash"
          style={{ animationDelay: ".4s" }}
        />
      </g>

      <g className="art-roll">
        <g transform="translate(150,176) scale(0.92)">
          <circle
            cx="-40"
            cy="22"
            r="19"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="5"
            opacity=".3"
          />
          <circle
            cx="88"
            cy="14"
            r="28"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="6"
          />
          <circle
            cx="88"
            cy="14"
            r="4.5"
            fill="var(--ink)"
          />
          <path
            d="M88 14 42-4 -4 8"
            stroke="var(--ink)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M42-4 32-40"
            stroke="var(--ink)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle
            cx="42"
            cy="-4"
            r="8"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="4"
          />
          <path
            d="M-6 8-4-54 16-58"
            stroke="var(--ink)"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />

          <path
            d="M28-42 48-18 36 6"
            stroke="var(--ink)"
            strokeWidth="9"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14-44h26a6 6 0 0 1 0 11H18Z"
            fill="var(--ink)"
          />
          <path
            d="M30-40 12-68"
            stroke="var(--mint)"
            strokeWidth="22"
            strokeLinecap="round"
          />
          <path
            d="M14-70-2-56"
            stroke="var(--mint)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle
            cx="8"
            cy="-82"
            r="12"
            fill="var(--canvas)"
          />
          <circle
            cx="2"
            cy="-80"
            r="1.7"
            fill="var(--ink)"
          />
          <path
            d="M-3-74q5 4 9 0"
            stroke="var(--ink)"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M-4-86a12 12 0 0 1 24-2l-2 3Z"
            fill="var(--ink)"
          />
          <path
            d="M-4-84h-6"
            stroke="var(--ink)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <path
            d="M-108 18h76c7 0 11-5 11-12v-10c0-11-9-20-20-20h-46c-12 0-21 9-21 20v22Z"
            fill="var(--red)"
          />
          <path
            d="M-108 6h84"
            stroke="var(--canvas)"
            strokeWidth="3"
            opacity=".28"
          />
          <path
            d="M-104-24h64a7 7 0 0 1 7 7v9h-78v-9a7 7 0 0 1 7-7Z"
            fill="var(--mint-deep)"
          />

          <Person
            x={-78}
            y={-52}
            s={1.05}
            cloth="var(--mint)"
            hairLong
          />
          <Person
            x={-46}
            y={-47}
            s={0.95}
            cloth="var(--mint-tint)"
            bald
          />

          <circle
            cx="-96"
            cy="22"
            r="21"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="6"
          />
          <circle
            cx="-96"
            cy="22"
            r="4"
            fill="var(--ink)"
          />
        </g>
      </g>

      <path
        d="M-20 224q200-16 400 0"
        stroke="var(--canvas-deep)"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </Hero>
  );
}

/** Community — hands reaching, a heart between them. */
export function HandsArt() {
  return (
    <Hero>
      <circle
        cx="180"
        cy="130"
        r="96"
        fill="var(--mint-tint)"
      />
      <g className="art-beat">
        <path
          d="M180 88c14-26 56-16 56 18 0 30-34 52-56 66-22-14-56-36-56-66 0-34 42-44 56-18Z"
          fill="var(--red)"
        />
      </g>
      <path
        d="M62 200c14-16 34-16 48-4"
        stroke="var(--ink)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M298 200c-14-16-34-16-48-4"
        stroke="var(--ink)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <g className="art-float">
        <circle
          cx="86"
          cy="82"
          r="11"
          fill="var(--mint)"
        />
      </g>
      <g
        className="art-float"
        style={{ animationDelay: ".8s" }}
      >
        <circle
          cx="286"
          cy="88"
          r="14"
          fill="var(--mint)"
        />
      </g>
    </Hero>
  );
}
