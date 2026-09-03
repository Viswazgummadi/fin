// Shared geometry helpers for the hand-built SVG chart primitives in components/charts/.
// Kept dependency-free on purpose — these are the only "chart library" this app has.

export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
];

export function colorAt(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

export type Point = { x: number; y: number };

/** Catmull-Rom -> cubic Bezier smoothing, so lines read as fluid curves rather than jagged segments. */
export function smoothPath(points: Point[]) {
  if (points.length < 2) return points.length === 1 ? `M ${points[0].x} ${points[0].y}` : '';
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Normalize a series of numbers into SVG points within [0,width] x [0,height], y flipped so larger values sit higher. */
export function toPoints(values: number[], width: number, height: number, padding = 0) {
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const innerHeight = height - padding * 2;
  const step = values.length > 1 ? width / (values.length - 1) : 0;

  return values.map((value, index) => ({
    x: values.length > 1 ? index * step : width / 2,
    y: padding + innerHeight - ((value - min) / range) * innerHeight,
  }));
}

export function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(angleRad), y: cy + radius * Math.sin(angleRad) };
}

export function circumference(radius: number) {
  return 2 * Math.PI * radius;
}

/** Bucket a 0..1 intensity into a discrete heat-map step for consistent, readable color bands. */
export function intensityBucket(value: number, max: number, steps = 4) {
  if (!max || value <= 0) return 0;
  const ratio = Math.min(1, value / max);
  return Math.max(1, Math.ceil(ratio * steps));
}
