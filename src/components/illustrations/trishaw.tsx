import { Illustration, type IllustrationProps } from "./illustration";

function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const spoke = r * 0.62;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        className="fill-paper"
      />
      <g
        strokeWidth={1.5}
        className="stroke-ink/30"
      >
        <path
          d={`M${cx - spoke} ${cy}H${cx + spoke}M${cx} ${cy - spoke}V${cy + spoke}`}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r - 5}
        />
      </g>
      <circle
        cx={cx}
        cy={cy}
        r={3.5}
        stroke="none"
        className="fill-ink"
      />
    </g>
  );
}

export function TrishawIllustration({
  className,
  title,
  wind = true,
}: IllustrationProps & { wind?: boolean }) {
  return (
    <Illustration
      viewBox="0 0 200 124"
      className={className}
      title={title}
    >
      <path
        d="M10 112H190"
        className="stroke-ink/20"
      />
      {wind ? (
        <path
          d="M4 50H14M0 61H11M5 72H15"
          className="stroke-ink/35"
        />
      ) : null}

      <path d="M96 24L90 54" />
      <path d="M22 36L28 60" />
      <path
        d="M20 36Q22 12 58 12H92Q100 12 100 21V26H34Q26 26 20 36Z"
        className="fill-mint"
      />
      <path
        d="M48 13Q44 19 43 26M68 12Q65 19 64 26"
        strokeWidth={1.5}
        className="stroke-ink/50"
      />

      <path d="M92 72L130 92L164 96L136 58L130 92" />
      <path d="M94 61L135 65" />
      <path d="M100 60L106 41" />
      <path
        d="M101 40H114"
        strokeWidth={4}
      />
      <path
        d="M128 55H144"
        strokeWidth={4.5}
      />

      <path
        d="M26 60H96L89 78H42Q29 78 26 60Z"
        className="fill-mint"
      />
      <path
        d="M58 71.5l-3.6-3.4a2.3 2.3 0 0 1 3.6-2.9a2.3 2.3 0 0 1 3.6 2.9Z"
        stroke="none"
        className="fill-red"
      />
      <rect
        x={33}
        y={50}
        width={52}
        height={10}
        rx={5}
        className="fill-red"
      />
      <rect
        x={80}
        y={24}
        width={11}
        height={36}
        rx={5.5}
        className="fill-red"
      />

      <Wheel
        cx={54}
        cy={92}
        r={20}
      />
      <Wheel
        cx={164}
        cy={96}
        r={16}
      />
      <circle
        cx={130}
        cy={92}
        r={5.5}
        className="fill-paper"
      />
      <path d="M130 92L135 102M131 102H140" />
    </Illustration>
  );
}
