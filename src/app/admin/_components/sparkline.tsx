const WIDTH = 80;
const HEIGHT = 32;
const TOP = 2;

const round = (value: number) => Math.round(value * 100) / 100;

export function sparkPath(values: number[], width = WIDTH, height = HEIGHT) {
  const max = Math.max(...values, 0);
  const step = width / (values.length - 1);
  const points = values.map((value, index) => ({
    x: index * step,
    y: max > 0 ? height - (value / max) * (height - TOP) : height,
  }));
  const slopes = points
    .slice(1)
    .map((point, index) => (point.y - points[index].y) / step);
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === points.length - 1) return slopes[index - 1];
    const before = slopes[index - 1];
    const after = slopes[index];
    return before * after <= 0 ? 0 : 2 / (1 / before + 1 / after);
  });
  const line = points
    .map((point, index) => {
      if (index === 0) return `M${round(point.x)},${round(point.y)}`;
      const from = points[index - 1];
      const third = step / 3;
      return [
        `C${round(from.x + third)},${round(from.y + tangents[index - 1] * third)}`,
        `${round(point.x - third)},${round(point.y - tangents[index] * third)}`,
        `${round(point.x)},${round(point.y)}`,
      ].join(" ");
    })
    .join("");
  return { line, area: `${line}L${width},${height}L0,${height}Z` };
}

export function Sparkline({
  values,
  emphasis,
}: {
  values: number[];
  emphasis: boolean;
}) {
  const { line, area } = sparkPath(values);
  const color = emphasis ? "var(--chart-1)" : "var(--chart-2)";
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="block h-8 w-20 shrink-0 overflow-visible"
    >
      <path
        d={area}
        fill={color}
        fillOpacity={0.12}
      />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
