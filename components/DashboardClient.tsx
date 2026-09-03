"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Account, Category, Limit, RecurringRule, Transaction } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { formatMoney, getRecentTransactions, getTransactionsForMonth, summarizeDailySpend, toDateKey } from '../lib/insights';
import { calculateTotalBalance, calculateMonthlyTotals } from '../lib/finance';
import { computeNetWorthSeries, computeCategoryBreakdown, pctDelta } from '../lib/analysis';
import { colorAt } from '../lib/charts';
import { queryKeys } from '../lib/query-keys';
import { WidgetManager } from './WidgetManager';
import { DashboardWidget } from '../lib/dashboard';
import { AreaChart } from './charts/AreaChart';
import { DonutChart } from './charts/DonutChart';
import { RadialProgress } from './charts/RadialProgress';
import { Sparkline } from './charts/Sparkline';
import { Repeat, SlidersHorizontal, TrendingDown, TrendingUp } from 'lucide-react';

const DASHBOARD_TRANSACTION_SELECT = 'id,account_id,transfer_account_id,type,amount,category_id,note,occurred_at,deleted_at';
const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_LIMITS: Limit[] = [];
const EMPTY_RECURRING: RecurringRule[] = [];

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

  const limitsQuery = useQuery({
    queryKey: queryKeys.limits,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from('limits').select('*').eq('active', true).order('amount', { ascending: false });
      if (error) throw error;
      return (data as Limit[] | null) ?? [];
    },
    enabled: !!supabase,
  });

  const recurringQuery = useQuery({
    queryKey: ['dashboard-recurring-rules'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('active', true)
        .order('next_run_date', { ascending: true })
        .limit(8);
      if (error) throw error;
      return (data as RecurringRule[] | null) ?? [];
    },
    enabled: !!supabase,
  });

  const accounts = accountsQuery.data ?? EMPTY_ACCOUNTS;
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const transactions = transactionsQuery.data ?? EMPTY_TRANSACTIONS;
  const limits = limitsQuery.data ?? EMPTY_LIMITS;
  const recurringRules = recurringQuery.data ?? EMPTY_RECURRING;

  const recent = useMemo(() => getRecentTransactions(transactions, 8), [transactions]);

  const spendingTrend = useMemo(() => {
    const map = summarizeDailySpend(transactions);
    const now = new Date();
    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (29 - index));
      const key = toDateKey(date);
      return { label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), value: map.get(key) ?? 0 };
    });
  }, [transactions]);

  const derived = useMemo(() => {
    const now = new Date();
    const thisMonthTxns = getTransactionsForMonth(transactions, now);
    const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthTxns = getTransactionsForMonth(transactions, lastMonthRef);
    const thisTotals = calculateMonthlyTotals(thisMonthTxns);
    const lastTotals = calculateMonthlyTotals(lastMonthTxns);
    const totalBalance = calculateTotalBalance(accounts, transactions);
    const balanceSeries = computeNetWorthSeries(accounts, transactions, {
      start: new Date(now.getTime() - 13 * 86_400_000),
      end: now,
    });
    const netWorthSeries = computeNetWorthSeries(accounts, transactions, {
      start: new Date(now.getTime() - 89 * 86_400_000),
      end: now,
    });
    const categoryRows = computeCategoryBreakdown(thisMonthTxns, [], categories);
    const last7Start = new Date(now);
    last7Start.setDate(last7Start.getDate() - 6);
    last7Start.setHours(0, 0, 0, 0);
    const last7Txns = transactions.filter((t) => !t.deleted_at && new Date(t.occurred_at) >= last7Start);

    return { thisMonthTxns, last7Txns, thisTotals, lastTotals, totalBalance, balanceSeries, netWorthSeries, categoryRows };
  }, [transactions, accounts, categories]);

  const loading =
    accountsQuery.isLoading || categoriesQuery.isLoading || transactionsQuery.isLoading || limitsQuery.isLoading || recurringQuery.isLoading;
  const error = accountsQuery.error || categoriesQuery.error || transactionsQuery.error || limitsQuery.error || recurringQuery.error;

  return (
    <WidgetManager>
      {({ visibleWidgets, isEditing, toggleEditMode, editorPanel }) => (
        <div className="space-y-6 fade-up">
          <div className="page-header flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="page-title">Dashboard</h1>
              <p className="page-copy">Balances, recent activity, and trends.</p>
            </div>
            <button onClick={toggleEditMode} type="button" className="btn-secondary inline-flex items-center gap-1.5 text-sm">
              <SlidersHorizontal size={15} />
              {isEditing ? 'Done' : 'Customize'}
            </button>
          </div>

          {editorPanel}

          {error ? <InlineError error={error} /> : null}

          {loading && !accounts.length && !transactions.length ? (
            <DashboardSkeleton />
          ) : (
            <div className="grid items-start gap-4 md:grid-cols-2">
              {visibleWidgets.map((widget) => (
                <DashboardWidgetView
                  key={widget.id}
                  widget={widget}
                  accounts={accounts}
                  limits={limits}
                  recurringRules={recurringRules}
                  recent={recent}
                  spendingTrend={spendingTrend}
                  derived={derived}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </WidgetManager>
  );
}

function DashboardWidgetView({
  widget,
  accounts,
  limits,
  recurringRules,
  recent,
  spendingTrend,
  derived,
}: {
  widget: DashboardWidget;
  accounts: Account[];
  limits: Limit[];
  recurringRules: RecurringRule[];
  recent: Transaction[];
  spendingTrend: { label: string; value: number }[];
  derived: {
    thisMonthTxns: Transaction[];
    last7Txns: Transaction[];
    thisTotals: { income: number; spent: number; transferred: number; saved: number };
    lastTotals: { income: number; spent: number; transferred: number; saved: number };
    totalBalance: number;
    balanceSeries: { date: string; balance: number }[];
    netWorthSeries: { date: string; balance: number }[];
    categoryRows: ReturnType<typeof computeCategoryBreakdown>;
  };
}) {
  switch (widget.type) {
    case 'balance':
      return (
        <div className="md:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              title="Total balance"
              value={formatMoney(derived.totalBalance)}
              subtitle="All accounts combined"
              spark={derived.balanceSeries.map((p) => p.balance)}
            />
            <StatTile
              title="Income"
              value={formatMoney(derived.thisTotals.income)}
              delta={pctDelta(derived.thisTotals.income, derived.lastTotals.income)}
              subtitle="This month"
            />
            <StatTile
              title="Spent"
              value={formatMoney(derived.thisTotals.spent)}
              delta={pctDelta(derived.thisTotals.spent, derived.lastTotals.spent)}
              invertDeltaColor
              subtitle="This month"
            />
            <StatTile
              title="Saved"
              value={formatMoney(derived.thisTotals.saved)}
              delta={pctDelta(derived.thisTotals.saved, derived.lastTotals.saved)}
              subtitle="This month"
            />
          </div>
        </div>
      );

    case 'net-worth':
      return (
        <Panel title="Net worth" action={<Link href="/analysis" className="text-xs text-[--accent]">Full analysis</Link>}>
          {accounts.length && derived.netWorthSeries.length > 1 ? (
            <AreaChart data={derived.netWorthSeries.map((p) => ({ label: p.date.slice(5), value: p.balance }))} formatValue={formatMoney} color="var(--accent)" />
          ) : (
            <EmptyState text="Add an account and a few transactions to see your net worth trend." />
          )}
        </Panel>
      );

    case 'spending-trend':
      return (
        <Panel title="Spending trend" action={<Link href="/analysis" className="text-xs text-[--accent]">Full analysis</Link>}>
          {spendingTrend.some((d) => d.value > 0) ? (
            <AreaChart data={spendingTrend} formatValue={formatMoney} color="var(--danger)" />
          ) : (
            <EmptyState text="No expenses in the last 30 days." />
          )}
        </Panel>
      );

    case 'recent-transactions':
      return (
        <Panel title="Recent transactions" action={<Link href="/whathappened" className="text-xs text-[--accent]">View journal</Link>}>
          {recent.length ? (
            <div className="space-y-2">
              {recent.map((txn) => (
                <div key={txn.id} className="data-row flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm">{txn.note || 'No note'}</div>
                    <div className="text-xs text-[--text-muted]">
                      {new Date(txn.occurred_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div className={`shrink-0 font-mono text-sm ${txn.type === 'income' ? 'text-[--accent]' : 'text-[--text-primary]'}`}>
                    {txn.type === 'income' ? '+' : txn.type === 'expense' ? '−' : ''}
                    {formatMoney(Number(txn.amount))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No transactions yet." />
          )}
        </Panel>
      );

    case 'top-categories':
      return (
        <Panel title="Top categories" action={<Link href="/analysis" className="text-xs text-[--accent]">Full analysis</Link>}>
          {derived.categoryRows.length ? (
            <DonutChart
              centerLabel={formatMoney(derived.thisTotals.spent)}
              centerSub="this month"
              slices={derived.categoryRows.slice(0, 6).map((row, index) => ({ id: row.id, label: row.name, value: row.amount, color: colorAt(index) }))}
            />
          ) : (
            <EmptyState text="Add expenses to see categories." />
          )}
        </Panel>
      );

    case 'budget-summary':
      return (
        <Panel title="Budget summary" action={<Link href="/limits" className="text-xs text-[--accent]">Manage limits</Link>}>
          {limits.length ? (
            <div className="flex flex-wrap justify-center gap-4">
              {limits.slice(0, 3).map((limit) => {
                // Weekly limits are measured against the trailing 7 days, monthly against the
                // calendar month — comparing a weekly budget to a whole month's spend would
                // wildly overstate it.
                const windowTxns = limit.period === 'weekly' ? derived.last7Txns : derived.thisMonthTxns;
                const spent = windowTxns
                  .filter((t) => t.type === 'expense' && (limit.scope === 'overall' || t.category_id === limit.scope_ref_id))
                  .reduce((sum, t) => sum + Number(t.amount || 0), 0);
                const ratio = Number(limit.amount) > 0 ? spent / Number(limit.amount) : 0;
                return (
                  <RadialProgress key={limit.id} size={104} thickness={10} value={ratio} label={`${Math.round(ratio * 100)}%`} sublabel={limit.period} />
                );
              })}
            </div>
          ) : (
            <EmptyState text="No active limits set." />
          )}
        </Panel>
      );

    case 'upcoming-bills':
      return (
        <Panel title="Upcoming bills" action={<Link href="/recurring-rules" className="text-xs text-[--accent]">Manage recurring</Link>}>
          {recurringRules.length ? (
            <div className="space-y-2">
              {recurringRules.slice(0, 5).map((rule) => (
                <div key={rule.id} className="data-row flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <Repeat size={14} className="shrink-0 text-[--text-muted]" />
                    <div className="min-w-0">
                      <div className="truncate text-sm">{rule.note || (rule.type === 'income' ? 'Income' : 'Expense')}</div>
                      <div className="text-xs text-[--text-muted]">
                        {new Date(rule.next_run_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {rule.frequency}
                      </div>
                    </div>
                  </div>
                  <div className={`shrink-0 font-mono text-sm ${rule.type === 'income' ? 'text-[--accent]' : 'text-[--text-primary]'}`}>
                    {formatMoney(Number(rule.amount))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No recurring bills set up." />
          )}
        </Panel>
      );

    default:
      return null;
  }
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatTile({
  title,
  value,
  delta,
  invertDeltaColor,
  subtitle,
  spark,
}: {
  title: string;
  value: string;
  delta?: number | null;
  invertDeltaColor?: boolean;
  subtitle?: string;
  spark?: number[];
}) {
  const isUp = typeof delta === 'number' && delta > 0;
  const isFlat = delta === 0;
  const isGood = invertDeltaColor ? !isUp : isUp;
  const hasSpark = Boolean(spark && spark.length > 1);
  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-[--text-secondary]">{title}</div>
          <div className={`mt-2 font-mono ${hasSpark ? 'text-xl' : 'text-2xl'}`}>{value}</div>
        </div>
        {hasSpark ? <Sparkline data={spark!} width={52} height={26} strokeWidth={1.75} fill={false} /> : null}
      </div>
      {typeof delta === 'number' ? (
        <div className={`mt-1 inline-flex items-center gap-1 text-xs ${isFlat ? 'text-[--text-muted]' : isGood ? 'text-[--accent]' : 'text-[--danger]'}`}>
          {isFlat ? null : isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isFlat ? 'No change vs last month' : `${Math.abs(Math.round(delta))}% vs last month`}
        </div>
      ) : subtitle ? (
        <div className="mt-1 text-xs text-[--text-muted]">{subtitle}</div>
      ) : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[--radius-sm] border border-dashed border-[--hairline] p-6 text-center text-sm text-[--text-muted]">{text}</div>;
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card h-24 p-4">
            <div className="h-3 w-20 rounded-full bg-white/10" />
            <div className="mt-4 h-7 w-28 rounded-full bg-white/5" />
            <div className="mt-3 h-3 w-24 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card h-64 p-4">
            <div className="h-4 w-32 rounded-full bg-white/10" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <div key={rowIndex} className="h-12 rounded-[--radius] bg-white/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
