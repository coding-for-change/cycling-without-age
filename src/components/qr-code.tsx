import { encode } from "uqr";
import { cn } from "@/lib/utils";

export function QrCode({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const { size, data } = encode(value, { border: 4 });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={value}
      className={cn("text-ink", className)}
    >
      {data.flatMap((row, y) =>
        row.map((dark, x) =>
          dark ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1"
              height="1"
              fill="currentColor"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
