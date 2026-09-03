"use client";

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { circumference } from '../../lib/charts';

export type DonutSlice = { label: string; value: number; color: string; id?: string };

export function DonutChart({
  slices,
  size = 176,
  thickness = 22,
  centerLabel,
  centerSub,
  onSliceClick,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
  onSliceClick?: (slice: DonutSlice) => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const active = slices.filter((s) => s.value > 0);
  const total = active.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = circumference(radius);

  const segments = useMemo(() => {
    let cumulative = 0;
    return active.map((slice, index) => {
      const fraction = slice.value / total;
      const length = fraction * circ;
      const offset = -cumulative;
      cumulative += length;
      return { ...slice, index, length, offset };
    });
  }, [active, total, circ]);

  const hovered = hoverIndex !== null ? segments[hoverIndex] : null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--track)" strokeWidth={thickness} />
          {segments.map((segment) => (
            <motion.circle
              key={segment.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={hoverIndex === segment.index ? thickness + 4 : thickness}
              strokeDasharray={`${segment.length} ${circ - segment.length}`}
              strokeLinecap={segments.length === 1 ? 'round' : 'butt'}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
              initial={{ strokeDashoffset: 0, strokeDasharray: `0 ${circ}` }}
              animate={{ strokeDashoffset: segment.offset, strokeDasharray: `${segment.length} ${circ - segment.length}` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: segment.index * 0.04 }}
              onMouseEnter={() => setHoverIndex(segment.index)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={() => onSliceClick?.(segment)}
              opacity={hoverIndex === null || hoverIndex === segment.index ? 1 : 0.45}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="font-mono text-lg text-[--text-primary]">{hovered ? hovered.label : centerLabel}</div>
          <div className="text-[11px] text-[--text-secondary]">
            {hovered ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format((hovered.value / total) * 100) + '%' : centerSub}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-xs text-[--text-secondary]">
        {(active.length ? segments : [{ label: 'No data', color: 'var(--hairline-strong)' }]).map((slice, index) => (
          <button
            key={slice.label}
            type="button"
            onMouseEnter={() => active.length && setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
            onClick={() => active.length && onSliceClick?.(segments[index])}
            className="inline-flex items-center gap-1.5 rounded-full border border-[--hairline] px-2.5 py-1 transition-colors hover:border-[--hairline-strong]"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: slice.color }} />
            {slice.label}
          </button>
        ))}
      </div>
    </div>
  );
}
