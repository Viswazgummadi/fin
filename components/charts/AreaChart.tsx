"use client";

import { useId, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { smoothPath, toPoints } from '../../lib/charts';

export type AreaChartPoint = { label: string; value: number };

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

export function AreaChart({
  data,
  height = 220,
  color = 'var(--accent)',
  formatValue = (n: number) => String(n),
  showLabels = true,
}: {
  data: AreaChartPoint[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
  showLabels?: boolean;
}) {
  const gradientId = useId();
  const [containerRef, width] = useContainerWidth();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const padding = 10;
  const chartHeight = height - (showLabels ? 24 : 0);

  const points = useMemo(() => {
    if (!width || !data.length) return [];
    return toPoints(
      data.map((d) => d.value),
      width,
      chartHeight,
      padding
    );
  }, [data, width, chartHeight]);

  const linePath = useMemo(() => smoothPath(points), [points]);
  const areaPath = useMemo(() => {
    if (!points.length) return '';
    return `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;
  }, [linePath, points, chartHeight]);

  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div ref={containerRef} className="w-full select-none">
      {width && points.length ? (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const step = width / Math.max(1, data.length - 1);
            const index = Math.round(x / step);
            setHoverIndex(Math.min(data.length - 1, Math.max(0, index)));
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          <motion.path
            d={areaPath}
            fill={`url(#${gradientId})`}
            stroke="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
          <motion.path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />

          {hoverIndex !== null && points[hoverIndex] ? (
            <g>
              <line
                x1={points[hoverIndex].x}
                x2={points[hoverIndex].x}
                y1={0}
                y2={chartHeight}
                stroke="var(--hairline-strong)"
                strokeDasharray="3 4"
              />
              <circle cx={points[hoverIndex].x} cy={points[hoverIndex].y} r={4.5} fill={color} stroke="var(--bg-1)" strokeWidth={2} />
            </g>
          ) : null}
        </svg>
      ) : (
        <div style={{ height }} />
      )}

      {hoverIndex !== null && data[hoverIndex] ? (
        <div className="pointer-events-none -mt-2 text-center">
          <span className="glass-1 inline-block px-2.5 py-1 text-xs">
            <span className="text-[--text-secondary]">{data[hoverIndex].label}</span>{' '}
            <span className="font-mono text-[--text-primary]">{formatValue(data[hoverIndex].value)}</span>
          </span>
        </div>
      ) : null}

      {showLabels ? (
        <div className="mt-1 flex justify-between text-[11px] text-[--text-muted]">
          {data
            .filter((_, index) => index % labelStep === 0)
            .map((point) => (
              <span key={point.label}>{point.label}</span>
            ))}
        </div>
      ) : null}
    </div>
  );
}
