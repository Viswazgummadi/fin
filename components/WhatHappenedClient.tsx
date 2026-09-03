"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, ArrowRightLeft } from 'lucide-react';
import type { Account, Category, Transaction } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { formatMoney, summarizeDailyTransactions, toDateKey } from '../lib/insights';
import { queryKeys } from '../lib/query-keys';

const REVIEW_TRANSACTION_SELECT = 'id,account_id,transfer_account_id,type,amount,category_id,note,occurred_at,is_planned,deleted_at';
const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];

const TYPE_ICON = {
  income: ArrowUpRight,
  expense: ArrowDownRight,
  transfer: ArrowRightLeft,
} as const;

const TYPE_COLOR = {
  income: 'var(--accent)',
  expense: 'var(--danger)',
  transfer: 'var(--accent-2)',
} as const;

function addDays(dateKey: string, days: number) {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${dateKey}T00:00:00`)
  );
}

export function WhatHappenedClient({ selectedDate }: { selectedDate: string }) {
  const supabase = createSupabaseBrowserClient();

  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from('accounts').select('*').eq('archived', false).order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Account[] | null) ?? [];
    },
    enabled: !!supabase,
  });

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

  const accounts = accountsQuery.data ?? EMPTY_ACCOUNTS;
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const transactions = transactionsQuery.data ?? EMPTY_TRANSACTIONS;

  const derived = useMemo(() => {
    const summary = summarizeDailyTransactions(transactions, selectedDate);
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    return { ...summary, accountMap, categoryMap };
  }, [accounts, categories, transactions, selectedDate]);

  const loading = accountsQuery.isLoading || categoriesQuery.isLoading || transactionsQuery.isLoading;
  const error = accountsQuery.error || categoriesQuery.error || transactionsQuery.error;
  const isToday = selectedDate === toDateKey(new Date());

  if (loading && !accounts.length && !transactions.length) {
    return <JournalSkeleton />;
  }

  return (
    <div className="space-y-6 fade-up">
      <div className="page-header">
        <h1 className="page-title">What happened?</h1>
        <p className="page-copy">{formatDateLabel(selectedDate)}</p>
      </div>

      {error ? <InlineError error={error} /> : null}

      <div className="glass-1 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/whathappened?date=${addDays(selectedDate, -1)}`} className="btn-ghost px-2 py-2" aria-label="Previous day">
            <ChevronLeft size={16} />
          </Link>
          <form method="get" className="flex items-center gap-2">
            <input type="date" name="date" defaultValue={selectedDate} className="field w-auto py-2" />
            <button className="btn-secondary py-2 text-sm">Go</button>
          </form>
          <Link href={`/whathappened?date=${addDays(selectedDate, 1)}`} className="btn-ghost px-2 py-2" aria-label="Next day">
            <ChevronRight size={16} />
          </Link>
        </div>
        {!isToday ? (
          <Link href={`/whathappened?date=${toDateKey(new Date())}`} className="text-xs text-[--accent]">
            Jump to today
          </Link>
        ) : (
          <span className="text-xs text-[--text-muted]">Today</span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Income" value={formatMoney(derived.income)} accent="var(--accent)" />
        <Metric title="Spent" value={formatMoney(derived.spent)} accent="var(--danger)" />
        <Metric title="Transferred" value={formatMoney(derived.transferred)} accent="var(--accent-2)" />
        <Metric title="Transactions" value={String(derived.list.length)} />
      </div>

      <section className="surface-card p-4">
        <div className="mb-3">
          <div className="kicker">Journal</div>
          <div className="mt-1 font-medium">Transactions on this day</div>
        </div>
        <div className="space-y-2">
          {derived.list.length ? derived.list.map((txn) => {
            const Icon = TYPE_ICON[txn.type];
            return (
              <div key={txn.id} className="data-row flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="surface-soft flex h-9 w-9 shrink-0 items-center justify-center">
                    <Icon size={16} style={{ color: TYPE_COLOR[txn.type] }} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{txn.note || 'No note'}</div>
                    <div className="truncate text-sm text-[--text-secondary]">
                      {derived.accountMap.get(txn.account_id) ?? 'Unknown account'}
                      {txn.category_id ? ` · ${derived.categoryMap.get(txn.category_id) ?? 'Unknown category'}` : ''}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 font-mono text-sm sm:text-right" style={{ color: TYPE_COLOR[txn.type] }}>
                  {txn.type === 'expense' ? '-' : txn.type === 'income' ? '+' : ''}{formatMoney(Number(txn.amount))}
                </div>
              </div>
            );
          }) : <EmptyState text="No transactions on this day." />}
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value, accent }: { title: string; value: string; accent?: string }) {
  return (
    <div className="surface-card p-4">
      <div className="text-sm text-[--text-secondary]">{title}</div>
      <div className="mt-2 font-mono text-2xl" style={accent ? { color: accent } : undefined}>{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[--radius-sm] border border-dashed border-[--hairline] p-6 text-center text-sm text-[--text-muted]">{text}</div>;
}

function InlineError({ error }: { error: unknown }) {
  return (
    <div className="surface-soft px-3 py-2 text-sm text-[--danger]">
      {error instanceof Error ? error.message : 'Could not load journal data.'}
    </div>
  );
}

function JournalSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-9 w-52 rounded-full bg-white/10" />
        <div className="h-4 max-w-2xl rounded-full bg-white/5" />
      </div>
      <div className="surface-card h-16 p-4" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card h-24 p-4" />
        ))}
      </div>
      <div className="surface-card h-80 p-4" />
    </div>
  );
}
