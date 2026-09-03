"use client";

import { useId, useMemo } from 'react';
import { motion } from 'framer-motion';
import { smoothPath, toPoints } from '../../lib/charts';

export function Sparkline({
  data,
  width = 160,
  height = 40,
  color = 'var(--accent)',
  strokeWidth = 2,
  fill = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  fill?: boolean;
}) {
  const gradientId = useId();
  const path = useMemo(() => {
    if (!data.length) return { line: '', area: '' };
    const padding = strokeWidth;
    const points = toPoints(data, width, height, padding);
    const line = smoothPath(points);
    const area = points.length
      ? `${line} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
      : '';
    return { line, area };
  }, [data, width, height, strokeWidth]);

  if (!data.length) return <div style={{ width, height }} />;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill ? <path d={path.area} fill={`url(#${gradientId})`} stroke="none" /> : null}
      <motion.path
        d={path.line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}
