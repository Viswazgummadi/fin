"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Account, Category, Transaction } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { formatMoney, summarizeDailyTransactions, toDateKey } from '../lib/insights';
import { queryKeys } from '../lib/query-keys';

const REVIEW_TRANSACTION_SELECT = 'id,account_id,transfer_account_id,type,amount,category_id,note,occurred_at,is_planned,deleted_at';
const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];

function addDays(dateKey: string, days: number) {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
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

  if (loading && !accounts.length && !transactions.length) {
    return <JournalSkeleton />;
  }

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-3xl font-semibold">What happened?</h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">Daily view for the selected date.</p>
      </div>

      {error ? <InlineError error={error} /> : null}

      <form className="flex flex-col gap-3 rounded-xl border border-border bg-bg-secondary p-4 sm:flex-row sm:flex-wrap sm:items-end" method="get">
        <label className="space-y-1 text-sm text-text-secondary">
          Date
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            className="block min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-text-primary"
          />
        </label>
        <button className="min-h-11 rounded-lg bg-accent px-4 py-2 font-medium text-black">Open</button>
        <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
          <Link className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border px-3 py-2 text-sm sm:flex-none" href={`/whathappened?date=${addDays(selectedDate, -1)}`}>
            Prev day
          </Link>
          <Link className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border px-3 py-2 text-sm sm:flex-none" href={`/whathappened?date=${addDays(selectedDate, 1)}`}>
            Next day
          </Link>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Income" value={formatMoney(derived.income)} />
        <Metric title="Spent" value={formatMoney(derived.spent)} />
        <Metric title="Transferred" value={formatMoney(derived.transferred)} />
        <Metric title="Transactions" value={String(derived.list.length)} />
      </div>

      <div className="rounded-xl border border-border bg-bg-secondary p-4">
        <div className="mb-3 text-sm text-text-secondary">{selectedDate}</div>
        <div className="space-y-2">
          {derived.list.length ? derived.list.map((txn) => (
            <div key={txn.id} className="flex flex-col gap-3 rounded-lg border border-border bg-bg-primary/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate font-medium">{txn.note || 'No note'}</div>
                <div className="text-sm text-text-secondary">
                  {derived.accountMap.get(txn.account_id) ?? 'Unknown account'}
                  {txn.category_id ? ` · ${derived.categoryMap.get(txn.category_id) ?? 'Unknown category'}` : ''}
                </div>
              </div>
              <div className="font-mono sm:text-right">{formatMoney(Number(txn.amount))}</div>
            </div>
          )) : <div className="rounded-lg border border-dashed border-border p-4 text-sm text-text-secondary">No transactions on this day.</div>}
        </div>
      </div>
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
      <div className="surface-card h-28 p-4" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card h-24 p-4" />
        ))}
      </div>
      <div className="surface-card h-80 p-4" />
    </div>
  );
}
