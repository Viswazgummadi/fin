"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Transaction } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { buildMonthGrid, formatMoney, summarizeDailySpend, toDateKey } from '../lib/insights';
import { queryKeys } from '../lib/query-keys';

const REVIEW_TRANSACTION_SELECT = 'id,type,amount,category_id,note,occurred_at,is_planned,deleted_at';
const EMPTY_TRANSACTIONS: Transaction[] = [];

export function CalendarClient() {
  const supabase = createSupabaseBrowserClient();
  const todayKey = useMemo(() => toDateKey(new Date()), []);

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
    const grid = buildMonthGrid(new Date(), spendMap);
    const activeDays = [...spendMap.values()].filter(Boolean).length;
    const totalSpend = [...spendMap.values()].reduce((sum, value) => sum + value, 0);
    return { spendMap, grid, activeDays, totalSpend };
  }, [transactions]);

  if (transactionsQuery.isLoading && !transactions.length) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-3xl font-semibold">Calendar</h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">Daily heatmap and journal entry.</p>
      </div>

      {transactionsQuery.error ? <InlineError error={transactionsQuery.error} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Month" value={derived.grid.monthLabel} />
        <Metric title="Active days" value={String(derived.activeDays)} />
        <Metric title="Total spend" value={formatMoney(derived.totalSpend)} />
      </div>

      <section className="rounded-xl border border-border bg-bg-secondary p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-text-secondary sm:gap-2 sm:text-xs">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => <div key={d}>{d}</div>)}
          {derived.grid.days.map((day) => (
            <Link
              key={day.key}
              href={`/whathappened?date=${day.key}`}
              className={`min-h-16 rounded-lg border p-1.5 transition sm:min-h-20 sm:p-2 ${
                day.inMonth ? 'border-border' : 'border-border/40 text-text-muted'
              } ${day.key === todayKey ? 'border-[--accent] ring-2 ring-[--accent]/30 bg-[--accent]/5' : ''} ${
                day.spend > 0 ? 'bg-accent/10' : 'bg-bg-primary/50'
              } hover:bg-bg-tertiary`}
            >
              <div className={`font-medium ${day.key === todayKey ? 'text-[--accent]' : 'text-text-primary'}`}>{day.label}</div>
              <div className="mt-1 font-mono text-[10px] sm:text-[11px]">{day.spend ? formatMoney(day.spend) : '—'}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <div className="text-sm text-text-secondary">{title}</div>
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
