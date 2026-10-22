import { Illustration, type IllustrationProps } from "./illustration";

export function BenchIllustration({ className, title }: IllustrationProps) {
  return (
    <Illustration
      viewBox="0 0 200 140"
      className={className}
      title={title}
    >
      <ellipse
        cx={100}
        cy={124}
        rx={90}
        ry={7}
        stroke="none"
        className="fill-mint-tint"
      />

      <rect
        x={146}
        y={66}
        width={9}
        height={58}
        rx={3}
        className="fill-paper"
      />
      <path d="M151 94L162 85" />
      <path
        d="M124 76C108 76 106 54 120 50C118 32 140 22 152 34C164 24 184 36 178 52C192 58 186 78 172 76Z"
        className="fill-mint"
      />
      <path
        d="M134 46q4-4 8 0M156 58q4-4 8 0M162 40q4-4 8 0"
        strokeWidth={1.5}
        className="stroke-ink/45"
      />

      <path
        d="M96 34q5-6 10 0q-5 6-10 0Z"
        strokeWidth={1.5}
        className="fill-mint"
      />
      <path
        d="M112 50q4-5 8-1q-3 5-8 1Z"
        strokeWidth={1.5}
        className="fill-mint"
      />

      <path d="M40 70V104M106 70V104" />
      <path d="M34 109L31 124M112 109L115 124" />
      <rect
        x={30}
        y={72}
        width={86}
        height={9}
        rx={4.5}
        className="fill-red"
      />
      <rect
        x={30}
        y={85}
        width={86}
        height={9}
        rx={4.5}
        className="fill-red"
      />
      <rect
        x={24}
        y={100}
        width={98}
        height={9}
        rx={4.5}
        className="fill-red"
      />

      <path
        d="M66 62L58 58L60 65"
        className="fill-paper"
      />
      <circle
        cx={72}
        cy={64}
        r={7}
        className="fill-paper"
      />
      <path
        d="M79 62.5L84 64L79 66"
        strokeWidth={1.5}
        className="fill-red"
      />
      <path
        d="M67.5 65q3 3 7 1"
        strokeWidth={1.5}
      />
      <circle
        cx={75}
        cy={62}
        r={1.25}
        stroke="none"
        className="fill-ink"
      />
      <path
        d="M70 71V72.5M74 71V72.5"
        strokeWidth={1.5}
      />
    </Illustration>
  );
}
