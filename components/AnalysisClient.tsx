"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Account, Category, Goal, Limit, Person, PersonLedger } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { formatMoney } from '../lib/insights';
import { queryKeys } from '../lib/query-keys';
import {
  PERIOD_OPTIONS,
  type PeriodKey,
  type TransactionWithTags,
  getPeriodRange,
  filterInRange,
  computeNetWorthSeries,
  computeCashflowByMonth,
  computeCategoryBreakdown,
  computeTagBreakdown,
  computeEssentialSplit,
  generateNarrativeInsights,
  detectAnomalies,
  pctDelta,
  type CategoryRow,
} from '../lib/analysis';
import { calculateAccountBalances } from '../lib/finance';
import { colorAt } from '../lib/charts';
import { AreaChart } from './charts/AreaChart';
import { DonutChart } from './charts/DonutChart';
import { BarChart } from './charts/BarChart';
import { HeatmapCalendar } from './charts/HeatmapCalendar';
import { RadialProgress } from './charts/RadialProgress';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const ANALYSIS_SELECT =
  'id,account_id,transfer_account_id,type,amount,category_id,note,occurred_at,is_planned,deleted_at,transaction_tags(tag_id,tags(id,name,color))';

const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_TXNS: TransactionWithTags[] = [];
const EMPTY_LIMITS: Limit[] = [];
const EMPTY_GOALS: Goal[] = [];
const EMPTY_LEDGER: (PersonLedger & { people: Pick<Person, 'name'> | null })[] = [];

export function AnalysisClient() {
  const supabase = createSupabaseBrowserClient();
  const [period, setPeriod] = useState<PeriodKey>('this_month');
  const [selectedRootCategory, setSelectedRootCategory] = useState<string | null>(null);

  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from('accounts').select('*').eq('archived', false);
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
    queryKey: queryKeys.analysisTransactions,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select(ANALYSIS_SELECT)
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      const rows = (data as unknown as Array<Record<string, unknown>>) ?? [];
      return rows.map((row) => ({
        ...row,
        tags: ((row.transaction_tags as { tags: { id: string; name: string; color: string | null } | null }[] | null) ?? [])
          .map((tt) => tt.tags)
          .filter((t): t is { id: string; name: string; color: string | null } => Boolean(t)),
      })) as TransactionWithTags[];
    },
    enabled: !!supabase,
  });

  const limitsQuery = useQuery({
    queryKey: queryKeys.limits,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from('limits').select('*').eq('active', true);
      if (error) throw error;
      return (data as Limit[] | null) ?? [];
    },
    enabled: !!supabase,
  });

  const goalsQuery = useQuery({
    queryKey: queryKeys.goals,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from('goals').select('*').eq('archived', false);
      if (error) throw error;
      return (data as Goal[] | null) ?? [];
    },
    enabled: !!supabase,
  });

  const ledgerQuery = useQuery({
    queryKey: queryKeys.peopleLedger,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from('people_ledger').select('*, people(name)');
      if (error) throw error;
      return (data as unknown as (PersonLedger & { people: Pick<Person, 'name'> | null })[] | null) ?? [];
    },
    enabled: !!supabase,
  });

  const accounts = accountsQuery.data ?? EMPTY_ACCOUNTS;
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const transactions = transactionsQuery.data ?? EMPTY_TXNS;
  const limits = limitsQuery.data ?? EMPTY_LIMITS;
  const goals = goalsQuery.data ?? EMPTY_GOALS;
  const ledger = ledgerQuery.data ?? EMPTY_LEDGER;

  const range = useMemo(() => getPeriodRange(period), [period]);

  const derived = useMemo(() => {
    const currentTxns = filterInRange(transactions, range.start, range.end);
    const previousTxns = range.prevStart && range.prevEnd ? filterInRange(transactions, range.prevStart, range.prevEnd) : [];

    const income = currentTxns.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = currentTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
    const prevIncome = previousTxns.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
    const prevExpense = previousTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);

    const netWorthNow = [...calculateAccountBalances(accounts, transactions).values()].reduce((s, v) => s + v, 0);
    const netWorthSeries = computeNetWorthSeries(accounts, transactions, { start: range.start, end: range.end });
    const cashflow = computeCashflowByMonth(transactions, 6);
    const categoryRows = computeCategoryBreakdown(currentTxns, previousTxns, categories);
    const tagRows = computeTagBreakdown(currentTxns, previousTxns);
    const essentialSplit = computeEssentialSplit(currentTxns, categories);
    const anomalies = detectAnomalies(currentTxns, transactions, categories);
    const insights = generateNarrativeInsights({
      periodLabel: range.label,
      income,
      expense,
      prevIncome,
      prevExpense,
      categoryRows,
      tagRows,
      essentialSplit,
    });

    const netOwed = ledger.reduce((sum, entry) => {
      const amount = Number(entry.amount || 0);
      if (entry.settled) return sum;
      if (entry.type === 'lent' || entry.type === 'reimbursement') return sum + amount;
      if (entry.type === 'borrowed') return sum - amount;
      return sum;
    }, 0);

    return {
      currentTxns,
      income,
      expense,
      prevIncome,
      prevExpense,
      savings: income - expense,
      savingsRate: income > 0 ? ((income - expense) / income) * 100 : null,
      netWorthNow,
      netWorthSeries,
      cashflow,
      categoryRows,
      tagRows,
      essentialSplit,
      anomalies,
      insights,
      netOwed,
    };
  }, [transactions, accounts, categories, ledger, range]);

  const heatValues = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.deleted_at || t.type !== 'expense') continue;
      const key = t.occurred_at.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + Number(t.amount || 0));
    }
    return map;
  }, [transactions]);

  const selectedCategory = derived.categoryRows.find((row) => row.id === selectedRootCategory) ?? null;

  const loading = accountsQuery.isLoading || categoriesQuery.isLoading || transactionsQuery.isLoading;
  const error = accountsQuery.error || categoriesQuery.error || transactionsQuery.error;

  return (
    <div className="space-y-6 fade-up">
      <div className="page-header flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Analysis</h1>
          <p className="page-copy">Where your money actually goes, and what changed.</p>
        </div>
        <PeriodSwitcher value={period} onChange={setPeriod} />
      </div>

      {error ? <InlineError error={error} /> : null}

      {loading && !transactions.length ? (
        <AnalysisSkeleton />
      ) : (
        <>
          {derived.insights.length ? (
            <div className="glass-1 flex flex-wrap items-start gap-3 p-4">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-[--accent]" />
              <div className="flex flex-1 flex-wrap gap-x-6 gap-y-2 text-sm text-[--text-secondary]">
                {derived.insights.map((line) => (
                  <span key={line} className="text-[--text-primary]">
                    {line}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatTile title="Net worth" value={formatMoney(derived.netWorthNow)} />
            <StatTile
              title="Income"
              value={formatMoney(derived.income)}
              delta={pctDelta(derived.income, derived.prevIncome)}
            />
            <StatTile
              title="Expense"
              value={formatMoney(derived.expense)}
              delta={pctDelta(derived.expense, derived.prevExpense)}
              invertDeltaColor
            />
            <StatTile
              title="Savings rate"
              value={derived.savingsRate !== null ? `${Math.round(derived.savingsRate)}%` : '—'}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Panel title="Net worth" action={<span className="text-xs text-[--text-muted]">{range.label}</span>}>
              <AreaChart
                data={derived.netWorthSeries.map((p) => ({ label: p.date.slice(5), value: p.balance }))}
                formatValue={formatMoney}
                color="var(--accent)"
              />
            </Panel>
            <Panel title="Cashflow" action={<span className="text-xs text-[--text-muted]">last 6 months</span>}>
              <div className="flex items-end gap-3">
                <BarChart
                  data={derived.cashflow.map((m) => ({ label: m.label, value: m.income, color: 'var(--accent)' }))}
                  formatValue={formatMoney}
                  height={160}
                />
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-[--text-secondary]">
                <LegendDot color="var(--accent)" label="Income" />
                <LegendDot color="var(--danger)" label="Expense (below)" />
              </div>
              <div className="mt-1 flex items-end gap-3">
                <BarChart
                  data={derived.cashflow.map((m) => ({ label: m.label, value: m.expense, color: 'var(--danger)' }))}
                  formatValue={formatMoney}
                  height={120}
                />
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.8fr]">
            <Panel title="Categories" action={selectedCategory ? <button onClick={() => setSelectedRootCategory(null)} className="text-xs text-[--accent]">Clear</button> : null}>
              {derived.categoryRows.length ? (
                <>
                  <DonutChart
                    centerLabel={formatMoney(derived.expense)}
                    centerSub={range.label.toLowerCase()}
                    slices={derived.categoryRows.slice(0, 8).map((row, index) => ({
                      id: row.id,
                      label: row.name,
                      value: row.amount,
                      color: colorAt(index),
                    }))}
                    onSliceClick={(slice) => setSelectedRootCategory(slice.id ?? null)}
                  />
                  {selectedCategory && selectedCategory.children.length ? (
                    <div className="mt-4 border-t border-[--hairline] pt-4">
                      <div className="mb-2 text-xs text-[--text-muted]">{selectedCategory.name} breakdown</div>
                      <BarChart
                        orientation="horizontal"
                        formatValue={formatMoney}
                        data={selectedCategory.children.map((c, i) => ({ label: c.name, value: c.amount, color: colorAt(i + 1) }))}
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <EmptyState text="No expenses in this period yet." />
              )}
            </Panel>

            <Panel title="Top categories">
              {derived.categoryRows.length ? (
                <CategoryList rows={derived.categoryRows.slice(0, 6)} />
              ) : (
                <EmptyState text="Nothing to rank yet." />
              )}
            </Panel>

            <Panel title="Essential vs discretionary">
              <DonutChart
                size={140}
                thickness={18}
                centerLabel={formatMoney(derived.essentialSplit.essential + derived.essentialSplit.nonEssential)}
                centerSub="tagged spend"
                slices={[
                  { label: 'Essential', value: derived.essentialSplit.essential, color: 'var(--accent)' },
                  { label: 'Discretionary', value: derived.essentialSplit.nonEssential, color: 'var(--chart-3)' },
                ]}
              />
              {derived.essentialSplit.unspecified > 0 ? (
                <div className="mt-2 text-center text-[11px] text-[--text-muted]">
                  {formatMoney(derived.essentialSplit.unspecified)} uncategorized as essential or not
                </div>
              ) : null}
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Tags" action={<Link href="/tags" className="text-xs text-[--accent]">Manage tags</Link>}>
              {derived.tagRows.length ? (
                <BarChart
                  orientation="horizontal"
                  formatValue={formatMoney}
                  data={derived.tagRows.slice(0, 6).map((row, index) => ({ label: row.name, value: row.amount, color: colorAt(index) }))}
                />
              ) : (
                <EmptyState text="No transactions have tags attached yet. Tag analysis will populate here once tags are applied to transactions." />
              )}
            </Panel>

            <Panel title="Unusual transactions">
              {derived.anomalies.length ? (
                <div className="space-y-2">
                  {derived.anomalies.map((a) => (
                    <div key={a.transaction.id} className="data-row flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle size={15} className="shrink-0 text-[--warning]" />
                        <div className="min-w-0">
                          <div className="truncate text-sm">{a.transaction.note || a.categoryName}</div>
                          <div className="text-xs text-[--text-muted]">{a.categoryName} · well above usual</div>
                        </div>
                      </div>
                      <div className="shrink-0 font-mono text-sm">{formatMoney(Number(a.transaction.amount))}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="Nothing unusual — spending looks consistent with history." />
              )}
            </Panel>
          </div>

          <Panel title="Daily spend" action={<span className="text-xs text-[--text-muted]">last 20 weeks</span>}>
            <HeatmapCalendar values={heatValues} weeks={20} formatValue={formatMoney} onDayClick={(key) => window.open(`/whathappened?date=${key}`, '_self')} />
          </Panel>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Budgets" action={<Link href="/limits" className="text-xs text-[--accent]">Manage limits</Link>}>
              {limits.length ? (
                <div className="flex flex-wrap justify-center gap-4">
                  {limits.slice(0, 3).map((limit) => {
                    const spent = derived.currentTxns
                      .filter((t) => t.type === 'expense' && (limit.scope === 'overall' || t.category_id === limit.scope_ref_id))
                      .reduce((s, t) => s + Number(t.amount || 0), 0);
                    const ratio = Number(limit.amount) > 0 ? spent / Number(limit.amount) : 0;
                    return (
                      <RadialProgress
                        key={limit.id}
                        size={104}
                        thickness={10}
                        value={ratio}
                        label={`${Math.round(ratio * 100)}%`}
                        sublabel={limit.period}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="No active limits set." />
              )}
            </Panel>

            <Panel title="Goals" action={<Link href="/goals" className="text-xs text-[--accent]">Manage goals</Link>}>
              {goals.length ? (
                <div className="flex flex-wrap justify-center gap-4">
                  {goals.slice(0, 3).map((goal) => {
                    const ratio = Number(goal.target_amount) > 0 ? Number(goal.current_amount) / Number(goal.target_amount) : 0;
                    return (
                      <RadialProgress
                        key={goal.id}
                        size={104}
                        thickness={10}
                        value={ratio}
                        color="var(--accent-2)"
                        label={`${Math.round(ratio * 100)}%`}
                        sublabel={goal.name}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="No savings goals yet." />
              )}
            </Panel>

            <Panel title="People" action={<Link href="/people" className="text-xs text-[--accent]">Open ledger</Link>}>
              <div className="flex h-full flex-col items-center justify-center gap-1 py-6">
                <div className={`font-mono text-2xl ${derived.netOwed >= 0 ? 'text-[--accent]' : 'text-[--danger]'}`}>
                  {formatMoney(Math.abs(derived.netOwed))}
                </div>
                <div className="text-xs text-[--text-secondary]">{derived.netOwed >= 0 ? 'net owed to you' : 'net you owe'}</div>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function PeriodSwitcher({ value, onChange }: { value: PeriodKey; onChange: (period: PeriodKey) => void }) {
  return (
    <div className="glass-1 inline-flex flex-wrap gap-1 p-1">
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={`rounded-[--radius-xs] px-3 py-1.5 text-xs font-medium transition-colors ${
            value === option.key ? 'bg-[--accent-wash] text-[--text-primary]' : 'text-[--text-secondary] hover:text-[--text-primary]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
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

function StatTile({ title, value, delta, invertDeltaColor }: { title: string; value: string; delta?: number | null; invertDeltaColor?: boolean }) {
  const isUp = typeof delta === 'number' && delta > 0;
  const isGood = invertDeltaColor ? !isUp : isUp;
  return (
    <div className="surface-card p-4">
      <div className="text-sm text-[--text-secondary]">{title}</div>
      <div className="mt-2 font-mono text-2xl">{value}</div>
      {typeof delta === 'number' ? (
        <div className={`mt-1 inline-flex items-center gap-1 text-xs ${isGood ? 'text-[--accent]' : 'text-[--danger]'}`}>
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(Math.round(delta))}% vs previous
        </div>
      ) : null}
    </div>
  );
}

function CategoryList({ rows }: { rows: CategoryRow[] }) {
  return (
    <div className="space-y-2">
      {rows.map((row, index) => {
        const delta = pctDelta(row.amount, row.previousAmount);
        return (
          <div key={row.id} className="data-row flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorAt(index) }} />
              <span className="truncate text-sm">{row.name}</span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {delta !== null ? (
                <span className={`text-xs ${delta > 0 ? 'text-[--danger]' : delta < 0 ? 'text-[--accent]' : 'text-[--text-muted]'}`}>
                  {delta === 0 ? '—' : `${delta > 0 ? '+' : ''}${Math.round(delta)}%`}
                </span>
              ) : null}
              <span className="font-mono text-sm">{formatMoney(row.amount)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[--radius-sm] border border-dashed border-[--hairline] p-6 text-center text-sm text-[--text-muted]">{text}</div>;
}

function InlineError({ error }: { error: unknown }) {
  return <div className="surface-soft px-3 py-2 text-sm text-[--danger]">{error instanceof Error ? error.message : 'Could not load analysis data.'}</div>;
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
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="surface-card h-72 p-4" />
        <div className="surface-card h-72 p-4" />
      </div>
    </div>
  );
}
