"use client";

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { intensityBucket } from '../../lib/charts';

const BUCKET_OPACITY = [0.06, 0.28, 0.48, 0.7, 1];
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function toKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function HeatmapCalendar({
  values,
  weeks = 20,
  endDate = new Date(),
  color = 'var(--accent)',
  formatValue = (n: number) => String(n),
  onDayClick,
}: {
  values: Map<string, number>;
  weeks?: number;
  endDate?: Date;
  color?: string;
  formatValue?: (value: number) => string;
  onDayClick?: (dateKey: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(...Array.from(values.values()), 1);

  const columns = useMemo(() => {
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const endSunday = new Date(end);
    endSunday.setDate(end.getDate() + (6 - end.getDay()));

    const grid: { key: string; inRange: boolean; value: number; bucket: number }[][] = [];
    for (let w = weeks - 1; w >= 0; w -= 1) {
      const week: { key: string; inRange: boolean; value: number; bucket: number }[] = [];
      for (let d = 0; d < 7; d += 1) {
        const day = new Date(endSunday);
        day.setDate(endSunday.getDate() - w * 7 + d);
        const key = toKey(day);
        const value = values.get(key) ?? 0;
        week.push({ key, inRange: day <= end, value, bucket: intensityBucket(value, max) });
      }
      grid.push(week);
    }
    return grid;
  }, [values, weeks, endDate, max]);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col justify-between py-1 text-[10px] text-[--text-muted]">
        {WEEKDAY_LABELS.map((label, index) => (
          <span key={index} className="h-3.5 leading-[14px]">
            {label}
          </span>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {columns.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day) => (
              <motion.button
                key={day.key}
                type="button"
                disabled={!day.inRange}
                onMouseEnter={() => setHovered(day.key)}
                onMouseLeave={() => setHovered((current) => (current === day.key ? null : current))}
                onClick={() => day.inRange && onDayClick?.(day.key)}
                className="relative h-3.5 w-3.5 rounded-[4px]"
                style={{
                  background: day.inRange ? color : 'transparent',
                  opacity: day.inRange ? BUCKET_OPACITY[day.bucket] : 0,
                  border: day.inRange ? '1px solid var(--hairline)' : 'none',
                  cursor: day.inRange && onDayClick ? 'pointer' : 'default',
                }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: day.inRange ? BUCKET_OPACITY[day.bucket] : 0 }}
                transition={{ duration: 0.3, delay: weekIndex * 0.012 }}
              >
                {hovered === day.key && day.inRange ? (
                  <span className="glass-1 pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap px-2 py-1 text-[11px]">
                    <span className="text-[--text-secondary]">{day.key}</span>{' '}
                    <span className="font-mono text-[--text-primary]">{formatValue(day.value)}</span>
                  </span>
                ) : null}
              </motion.button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
