"use client";

import { motion } from 'framer-motion';
import { circumference } from '../../lib/charts';

export function RadialProgress({
  value,
  size = 128,
  thickness = 12,
  color = 'var(--accent)',
  overColor = 'var(--danger)',
  label,
  sublabel,
}: {
  /** 0..1 fraction of target. Values above 1 render as over-budget. */
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  overColor?: string;
  label?: string;
  sublabel?: string;
}) {
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = circumference(radius);
  const clamped = Math.min(1, Math.max(0, value));
  const isOver = value > 1;
  const ringColor = isOver ? overColor : color;

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--track)" strokeWidth={thickness} />
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={thickness}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${clamped * circ} ${circ - clamped * circ}` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {label ? <div className="font-mono text-lg text-[--text-primary]">{label}</div> : null}
        {sublabel ? <div className="text-[11px] text-[--text-secondary]">{sublabel}</div> : null}
      </div>
    </div>
  );
}
