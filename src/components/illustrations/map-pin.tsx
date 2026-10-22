import { Illustration, type IllustrationProps } from "./illustration";

export function MapPinIllustration({ className, title }: IllustrationProps) {
  return (
    <Illustration
      viewBox="0 0 120 110"
      className={className}
      title={title}
    >
      <path
        d="M12 42L42 32L76 42L108 32V90L76 100L42 90L12 100Z"
        className="fill-paper"
      />
      <path
        d="M42 32L76 42V100L42 90Z"
        className="fill-mint-tint"
      />
      <path d="M42 32V90M76 42V100" />
      <path
        d="M22 84C34 70 50 86 62 72"
        strokeDasharray="1 6"
        className="stroke-ink/55"
      />
      <path
        d="M88 56l6 6M94 56l-6 6"
        strokeWidth={2}
        className="stroke-ink/45"
      />
      <ellipse
        cx={66}
        cy={74}
        rx={8}
        ry={2.5}
        stroke="none"
        className="fill-ink/15"
      />
      <path
        d="M66 14C54 14 46 23 46 34C46 48 66 70 66 70C66 70 86 48 86 34C86 23 78 14 66 14Z"
        className="fill-red"
      />
      <circle
        cx={66}
        cy={34}
        r={7}
        className="fill-paper"
      />
    </Illustration>
  );
}
