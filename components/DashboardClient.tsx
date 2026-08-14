"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Account, Category, Transaction } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { DashboardStats } from './DashboardStats';
import { formatMoney, getRecentTransactions, summarizeCategories } from '../lib/insights';
import { queryKeys } from '../lib/query-keys';

const DASHBOARD_TRANSACTION_SELECT = 'id,account_id,transfer_account_id,type,amount,category_id,note,occurred_at,deleted_at';
const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];

export function DashboardClient() {
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
    queryKey: queryKeys.dashboardTransactions,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select(DASHBOARD_TRANSACTION_SELECT)
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data as Transaction[] | null) ?? [];
    },
    enabled: !!supabase,
  });

  const accounts = accountsQuery.data ?? EMPTY_ACCOUNTS;
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const transactions = transactionsQuery.data ?? EMPTY_TRANSACTIONS;

  const recent = useMemo(() => getRecentTransactions(transactions, 8), [transactions]);
  const topCategories = useMemo(() => summarizeCategories(transactions, categories).slice(0, 5), [transactions, categories]);

  const loading = accountsQuery.isLoading || categoriesQuery.isLoading || transactionsQuery.isLoading;
  const error = accountsQuery.error || categoriesQuery.error || transactionsQuery.error;

  return (
    <div className="space-y-6 fade-up">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-copy">See balances, recent activity, and patterns at a glance. Quick spend already lives in the header, so the dashboard stays clean.</p>
      </div>

      {error ? <InlineError error={error} /> : null}

      {loading && !accounts.length && !transactions.length ? (
        <DashboardSkeleton />
      ) : (
        <>
          <DashboardStats accounts={accounts} transactions={transactions} />

          <div className="grid gap-4 xl:grid-cols-2">
            <Section title="Recent transactions" action={<Link href="/whathappened" className="text-sm text-[--accent]">View journal</Link>}>
              <div className="space-y-2">
                {recent.length ? recent.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between rounded-[--radius] border-thin bg-[--bg-secondary] px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{txn.note || 'No note'}</div>
                      <div className="text-xs text-[--text-muted]">{new Date(txn.occurred_at).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div className="text-sm font-mono">{formatMoney(Number(txn.amount))}</div>
                  </div>
                )) : <Empty text="No transactions yet." />}
              </div>
            </Section>

            <Section title="Top categories" action={<Link href="/analysis" className="text-sm text-[--accent]">Full analysis</Link>}>
              <div className="space-y-2">
                {topCategories.length ? topCategories.map((row) => (
                  <div key={row.category} className="flex items-center justify-between rounded-[--radius] border-thin bg-[--bg-secondary] px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{row.category}</div>
                      <div className="text-xs text-[--text-muted]">{row.count} txns</div>
                    </div>
                    <div className="text-sm font-mono">{formatMoney(row.amount)}</div>
                  </div>
                )) : <Empty text="Add expenses to see categories." />}
              </div>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[--radius] border-thin bg-[--bg-secondary]/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-[--radius] border border-dashed border-[--border] p-4 text-center text-sm text-[--text-muted]">{text}</div>;
}

function InlineError({ error }: { error: unknown }) {
  return (
    <div className="surface-soft px-3 py-2 text-sm text-[--danger]">
      {error instanceof Error ? error.message : 'Could not load dashboard data.'}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card h-24 p-4">
            <div className="h-3 w-20 rounded-full bg-white/10" />
            <div className="mt-4 h-7 w-28 rounded-full bg-white/5" />
            <div className="mt-3 h-3 w-24 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="surface-card h-72 p-4">
            <div className="h-4 w-32 rounded-full bg-white/10" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((__, rowIndex) => (
                <div key={rowIndex} className="h-12 rounded-[--radius] bg-white/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
