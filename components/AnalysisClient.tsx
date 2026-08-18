"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Category, Transaction } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import {
  buildMonthGrid,
  formatMoney,
  getCurrentMonthKey,
  summarizeCategories,
  summarizeDailySpend,
  summarizeTopNotes,
  summarizeWeekdays,
  toDateKey,
} from '../lib/insights';
import { queryKeys } from '../lib/query-keys';

const ANALYSIS_TRANSACTION_SELECT = 'type,amount,category_id,note,occurred_at,is_planned,deleted_at';
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];

export function AnalysisClient() {
  const supabase = createSupabaseBrowserClient();
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from('categories').select('*').eq('archived', false).order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as Category[] | null) ?? [];
    },
    enabled: !!supabase,
    staleTime: 5 * 60_000,
  });

  const transactionsQuery = useQuery({
    queryKey: queryKeys.analysisTransactions,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select(ANALYSIS_TRANSACTION_SELECT)
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return ((data as unknown) as Transaction[] | null) ?? [];
    },
    enabled: !!supabase,
  });

  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const transactions = transactionsQuery.data ?? EMPTY_TRANSACTIONS;

  const derived = useMemo(() => {
    const categoryRows = summarizeCategories(transactions, categories);
    const weekdayRows = summarizeWeekdays(transactions);
    const topNotes = summarizeTopNotes(transactions);
    const dailySpend = summarizeDailySpend(transactions);
    const monthGrid = buildMonthGrid(new Date(), dailySpend);
    const currentMonthKey = getCurrentMonthKey();
    const currentMonthExpenses = [...dailySpend.entries()].filter(([key]) => key.startsWith(currentMonthKey)).reduce((sum, [, amount]) => sum + amount, 0);
    const typeTotals = {
      income: transactions.filter((t) => !t.deleted_at && t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
      expense: transactions.filter((t) => !t.deleted_at && t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
      transfer: transactions.filter((t) => !t.deleted_at && t.type === 'transfer').reduce((sum, t) => sum + Number(t.amount), 0),
    };
    const plannedExpense = transactions.filter((t) => !t.deleted_at && t.type === 'expense' && t.is_planned !== false).reduce((sum, t) => sum + Number(t.amount), 0);
    const unplannedExpense = transactions.filter((t) => !t.deleted_at && t.type === 'expense' && t.is_planned === false).reduce((sum, t) => sum + Number(t.amount), 0);
    const topExpenseTotal = categoryRows.slice(0, 5).reduce((sum, row) => sum + row.amount, 0);

    return {
      categoryRows,
      weekdayRows,
      topNotes,
      dailySpend,
      monthGrid,
      currentMonthExpenses,
      typeTotals,
      plannedExpense,
      unplannedExpense,
      topExpenseTotal,
    };
  }, [categories, transactions]);

  const loading = categoriesQuery.isLoading || transactionsQuery.isLoading;
  const error = categoriesQuery.error || transactionsQuery.error;

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-3xl font-semibold">Analysis</h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">Analysis of spending patterns.</p>
      </div>

      {error ? <InlineError error={error} /> : null}

      {loading && !transactions.length ? (
        <AnalysisSkeleton />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric title="Tracked categories" value={String(categories.length)} />
            <Metric title="Current month spend" value={formatMoney(derived.currentMonthExpenses)} />
            <Metric title="Expense days" value={String(derived.dailySpend.size)} />
            <Metric title="Repeated notes" value={String(derived.topNotes.length)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Category share" action={<Link href="/transactions" className="text-sm text-accent">Open transactions</Link>}>
              <Donut
                center={formatMoney(derived.topExpenseTotal)}
                subtitle="top categories"
                slices={derived.categoryRows.slice(0, 5).map((row, index) => ({
                  label: row.category,
                  value: row.amount,
                  color: ['#10b981', '#6366f1', '#f43f5e', '#f59e0b', '#14b8a6'][index % 5],
                }))}
              />
              <List rows={derived.categoryRows.slice(0, 5).map((row) => ({ left: row.category, right: formatMoney(row.amount), sub: `${row.count} txns` }))} />
            </Panel>

            <Panel title="Transaction mix">
              <Donut
                center={formatMoney(derived.typeTotals.expense + derived.typeTotals.income)}
                subtitle="cashflow"
                slices={[
                  { label: 'Income', value: derived.typeTotals.income, color: '#10b981' },
                  { label: 'Expense', value: derived.typeTotals.expense, color: '#f43f5e' },
                  { label: 'Transfer', value: derived.typeTotals.transfer, color: '#6366f1' },
                ]}
              />
              <List rows={[
                { left: 'Income', right: formatMoney(derived.typeTotals.income) },
                { left: 'Expense', right: formatMoney(derived.typeTotals.expense) },
                { left: 'Transfer', right: formatMoney(derived.typeTotals.transfer) },
              ]} />
            </Panel>

            <Panel title="Planned vs unplanned">
              <Donut
                center={formatMoney(derived.plannedExpense + derived.unplannedExpense)}
                subtitle="expenses"
                slices={[
                  { label: 'Planned', value: derived.plannedExpense, color: '#10b981' },
                  { label: 'Unplanned', value: derived.unplannedExpense, color: '#f43f5e' },
                ]}
              />
              <List rows={[
                { left: 'Planned', right: formatMoney(derived.plannedExpense) },
                { left: 'Unplanned', right: formatMoney(derived.unplannedExpense) },
              ]} />
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Weekday spend">
              <Bars rows={derived.weekdayRows.map((row) => ({ label: row.label, value: row.amount, note: `${row.count} txns` }))} />
            </Panel>
            <Panel title="Top repeated notes">
              <List rows={derived.topNotes.length ? derived.topNotes.map((row) => ({ left: row.note, right: formatMoney(row.amount), sub: `${row.count} times` })) : [{ left: 'No repeated notes yet', right: '', sub: 'Add more transactions to see patterns.' }]} />
            </Panel>
          </div>

          <Panel title={derived.monthGrid.monthLabel}>
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-text-secondary">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => <div key={d}>{d}</div>)}
              {derived.monthGrid.days.map((day) => (
                <Link
                  key={day.key}
                  href={`/whathappened?date=${day.key}`}
                  className={`min-h-14 rounded-lg border p-2 transition ${day.inMonth ? 'border-border' : 'border-border/40 text-text-muted'} ${
                    day.key === todayKey ? 'border-[--accent] ring-2 ring-[--accent]/30 bg-[--accent]/5' : ''
                  } ${day.spend > 0 ? 'bg-accent/10' : 'bg-bg-secondary'}`}
                >
                  <div className={`font-medium ${day.key === todayKey ? 'text-[--accent]' : 'text-text-primary'}`}>{day.label}</div>
                  <div className="mt-1 font-mono text-[11px]">{day.spend ? formatMoney(day.spend) : '—'}</div>
                </Link>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-bg-secondary p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
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

function List({ rows }: { rows: { left: string; right: string; sub?: string }[] }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={`${row.left}-${row.sub ?? ''}`} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-bg-primary/50 px-3 py-2">
          <div>
            <div className="font-medium">{row.left}</div>
            {row.sub ? <div className="text-xs text-text-secondary">{row.sub}</div> : null}
          </div>
          <div className="font-mono">{row.right}</div>
        </div>
      ))}
    </div>
  );
}

function Donut({ center, subtitle, slices }: { center: string; subtitle: string; slices: { label: string; value: number; color: string }[] }) {
  const activeSlices = slices.filter((slice) => slice.value > 0);
  const total = activeSlices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  let running = 0;
  const stops = activeSlices
    .map((slice) => {
      const start = (running / total) * 100;
      running += slice.value;
      const end = (running / total) * 100;
      return `${slice.color} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-40 w-40 rounded-full border border-border" style={{ background: activeSlices.length ? `conic-gradient(${stops})` : 'var(--bg-primary)' }}>
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full border border-border bg-bg-secondary text-center">
          <div className="font-mono text-lg">{center}</div>
          <div className="text-[11px] text-text-secondary">{subtitle}</div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-xs text-text-secondary">
        {(activeSlices.length ? activeSlices : [{ label: 'No data', value: 0, color: '#6b6b73' }]).map((slice) => (
          <span key={slice.label} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: slice.color }} />
            {slice.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Bars({ rows }: { rows: { label: string; value: number; note: string }[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div>{row.label}</div>
            <div className="text-text-secondary">{row.note}</div>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-bg-primary/60">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function InlineError({ error }: { error: unknown }) {
  return (
    <div className="surface-soft px-3 py-2 text-sm text-[--danger]">
      {error instanceof Error ? error.message : 'Could not load analysis data.'}
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card h-24 p-4">
            <div className="h-3 w-20 rounded-full bg-white/10" />
            <div className="mt-4 h-7 w-28 rounded-full bg-white/5" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="surface-card h-[28rem] p-4" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="surface-card h-72 p-4" />
        ))}
      </div>
    </div>
  );
}
