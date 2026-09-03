"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Transaction } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { buildMonthGrid, formatMoney, summarizeDailySpend, toDateKey } from '../lib/insights';
import { queryKeys } from '../lib/query-keys';

const REVIEW_TRANSACTION_SELECT = 'id,type,amount,category_id,note,occurred_at,is_planned,deleted_at';
const EMPTY_TRANSACTIONS: Transaction[] = [];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarClient() {
  const supabase = createSupabaseBrowserClient();
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [monthOffset, setMonthOffset] = useState(0);

  const reference = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const transactionsQuery = useQuery({
    queryKey: queryKeys.reviewTransactions,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select(REVIEW_TRANSACTION_SELECT)
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data as Transaction[] | null) ?? [];
    },
    enabled: !!supabase,
  });

  const transactions = transactionsQuery.data ?? EMPTY_TRANSACTIONS;

  const derived = useMemo(() => {
    const spendMap = summarizeDailySpend(transactions);
    const grid = buildMonthGrid(reference, spendMap);
    const monthSpends = grid.days.filter((d) => d.inMonth).map((d) => d.spend);
    const activeDays = monthSpends.filter(Boolean).length;
    const totalSpend = monthSpends.reduce((sum, value) => sum + value, 0);
    const maxSpend = Math.max(1, ...monthSpends);
    return { grid, activeDays, totalSpend, maxSpend };
  }, [transactions, reference]);

  if (transactionsQuery.isLoading && !transactions.length) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="space-y-6 fade-up">
      <div className="page-header flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-copy">Daily spend heatmap — jump into any day&apos;s journal.</p>
        </div>
        <div className="glass-1 inline-flex items-center gap-1 p-1">
          <button onClick={() => setMonthOffset((m) => m - 1)} className="btn-ghost px-2 py-1.5" aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setMonthOffset(0)}
            className={`rounded-[--radius-xs] px-3 py-1.5 text-xs font-medium ${monthOffset === 0 ? 'bg-[--accent-wash] text-[--text-primary]' : 'text-[--text-secondary] hover:text-[--text-primary]'}`}
          >
            This month
          </button>
          <button onClick={() => setMonthOffset((m) => m + 1)} className="btn-ghost px-2 py-1.5" aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {transactionsQuery.error ? <InlineError error={transactionsQuery.error} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Month" value={derived.grid.monthLabel} />
        <Metric title="Active days" value={String(derived.activeDays)} />
        <Metric title="Total spend" value={formatMoney(derived.totalSpend)} />
      </div>

      <section className="surface-card p-3 sm:p-4">
        <div className="mb-2 grid grid-cols-7 gap-1.5 text-center sm:gap-2">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="kicker">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {derived.grid.days.map((day) => {
            const isToday = day.key === todayKey;
            const intensity = day.inMonth && day.spend > 0 ? Math.min(1, day.spend / derived.maxSpend) : 0;
            return (
              <Link
                key={day.key}
                href={`/whathappened?date=${day.key}`}
                className={`min-h-16 rounded-[--radius-xs] border p-1.5 transition sm:min-h-20 sm:p-2 ${
                  day.inMonth ? 'border-[--hairline]' : 'border-[--hairline]/40'
                } ${isToday ? 'border-[--accent] ring-2 ring-[--accent]/30' : ''} hover:border-[--accent-2]/40`}
                style={{
                  background: day.inMonth
                    ? intensity > 0
                      ? `rgba(var(--danger-rgb), ${0.08 + intensity * 0.28})`
                      : 'rgba(255,255,255,0.015)'
                    : 'transparent',
                }}
              >
                <div className={`font-medium ${isToday ? 'text-[--accent]' : day.inMonth ? 'text-[--text-primary]' : 'text-[--text-muted]'}`}>
                  {day.label}
                </div>
                <div className="mt-1 font-mono text-[10px] text-[--text-secondary] sm:text-[11px]">
                  {day.inMonth && day.spend ? formatMoney(day.spend) : day.inMonth ? '—' : ''}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="surface-card p-4">
      <div className="text-sm text-[--text-secondary]">{title}</div>
      <div className="mt-2 font-mono text-2xl">{value}</div>
    </div>
  );
}

function InlineError({ error }: { error: unknown }) {
  return (
    <div className="surface-soft px-3 py-2 text-sm text-[--danger]">
      {error instanceof Error ? error.message : 'Could not load calendar data.'}
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-9 w-40 rounded-full bg-white/10" />
        <div className="h-4 max-w-2xl rounded-full bg-white/5" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="surface-card h-24 p-4" />
        ))}
      </div>
      <div className="surface-card h-[28rem] p-4 sm:h-[36rem]" />
    </div>
  );
}
