"use client";

import { motion } from 'framer-motion';

export type BarDatum = { label: string; value: number; color?: string; sublabel?: string };

export function BarChart({
  data,
  orientation = 'vertical',
  height = 160,
  color = 'var(--accent)',
  formatValue = (n: number) => String(n),
  onBarClick,
}: {
  data: BarDatum[];
  orientation?: 'vertical' | 'horizontal';
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
  onBarClick?: (datum: BarDatum) => void;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  if (orientation === 'horizontal') {
    return (
      <div className="space-y-3">
        {data.map((datum, index) => (
          <button
            key={datum.label}
            type="button"
            onClick={() => onBarClick?.(datum)}
            className={`block w-full space-y-1 text-left ${onBarClick ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="truncate text-[--text-primary]">{datum.label}</span>
              <span className="shrink-0 font-mono text-[--text-secondary]">{formatValue(datum.value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[--bg-1]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: datum.color ?? color }}
                initial={{ width: 0 }}
                animate={{ width: `${(datum.value / max) * 100}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.03 }}
              />
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((datum, index) => (
        <button
          key={datum.label}
          type="button"
          onClick={() => onBarClick?.(datum)}
          className={`group flex flex-1 flex-col items-center justify-end gap-2 ${onBarClick ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span className="font-mono text-[11px] text-[--text-secondary] opacity-0 transition-opacity group-hover:opacity-100">
            {formatValue(datum.value)}
          </span>
          <motion.div
            className="w-full rounded-t-[10px]"
            style={{ background: datum.color ?? color, minHeight: 2 }}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(2, (datum.value / max) * (height - 28))}px` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.03 }}
          />
          <span className="text-[11px] text-[--text-muted]">{datum.label}</span>
        </button>
      ))}
    </div>
  );
}
