"use client";

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trash2,
  X,
} from 'lucide-react';
import type { Account, Category, Transaction } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { buildMonthGrid, formatMoney, summarizeDailySpend, summarizeDailyTransactions, toDateKey } from '../lib/insights';
import { queryKeys } from '../lib/query-keys';
import { enqueueOfflineOutboxItem } from '../lib/offline-sync';
import { BackLink } from './BackLink';

const REVIEW_TRANSACTION_SELECT = 'id,account_id,transfer_account_id,type,amount,category_id,note,occurred_at,is_planned,deleted_at';
const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_CATEGORIES: Category[] = [];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${dateKey}T00:00:00`)
  );
}

export function CalendarClient() {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const transactions = transactionsQuery.data ?? EMPTY_TRANSACTIONS;
  const accounts = accountsQuery.data ?? EMPTY_ACCOUNTS;
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const derived = useMemo(() => {
    const spendMap = summarizeDailySpend(transactions);
    const grid = buildMonthGrid(reference, spendMap);
    const monthSpends = grid.days.filter((d) => d.inMonth).map((d) => d.spend);
    const activeDays = monthSpends.filter(Boolean).length;
    const totalSpend = monthSpends.reduce((sum, value) => sum + value, 0);
    const maxSpend = Math.max(1, ...monthSpends);
    return { grid, activeDays, totalSpend, maxSpend };
  }, [transactions, reference]);

  const refreshAfterDelete = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.reviewTransactions });
    await queryClient.invalidateQueries({ queryKey: queryKeys.transactionWindows });
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardTransactions });
    await queryClient.invalidateQueries({ queryKey: queryKeys.analysisTransactions });
    await queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
  };

  const deleteTxn = async (txn: Transaction) => {
    queryClient.setQueryData<Transaction[]>(queryKeys.reviewTransactions, (current) =>
      (current ?? []).filter((item) => item.id !== txn.id)
    );

    if (!navigator.onLine || !supabase) {
      enqueueOfflineOutboxItem({
        id: crypto.randomUUID(),
        kind: 'transaction-soft-delete',
        transactionId: txn.id,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    const { error } = await supabase.from('transactions').update({ deleted_at: new Date().toISOString() }).eq('id', txn.id);
    if (error) {
      enqueueOfflineOutboxItem({
        id: crypto.randomUUID(),
        kind: 'transaction-soft-delete',
        transactionId: txn.id,
        createdAt: new Date().toISOString(),
      });
    }
    await refreshAfterDelete();
  };

  if (transactionsQuery.isLoading && !transactions.length) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="space-y-6 fade-up">
      <div className="page-header flex flex-wrap items-end justify-between gap-4">
        <div>
          <BackLink href="/manage" label="Manage" />
          <h1 className="page-title">Calendar</h1>
          <p className="page-copy">Daily spend heatmap — click any day to see what happened.</p>
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
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDate(day.key)}
                disabled={!day.inMonth}
                className={`min-h-16 rounded-[--radius-xs] border p-1.5 text-left transition sm:min-h-20 sm:p-2 ${
                  day.inMonth ? 'border-[--hairline] hover:border-[--accent-2]/40' : 'cursor-default border-[--hairline]/40'
                } ${isToday ? 'border-[--accent] ring-2 ring-[--accent]/30' : ''}`}
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
              </button>
            );
          })}
        </div>
      </section>

      <AnimatePresence>
        {selectedDate ? (
          <DayPopup
            key="day-popup"
            dateKey={selectedDate}
            transactions={transactions}
            accountMap={accountMap}
            categoryMap={categoryMap}
            onClose={() => setSelectedDate(null)}
            onDelete={deleteTxn}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DayPopup({
  dateKey,
  transactions,
  accountMap,
  categoryMap,
  onClose,
  onDelete,
}: {
  dateKey: string;
  transactions: Transaction[];
  accountMap: Map<string, string>;
  categoryMap: Map<string, string>;
  onClose: () => void;
  onDelete: (txn: Transaction) => void | Promise<void>;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const summary = useMemo(() => summarizeDailyTransactions(transactions, dateKey), [transactions, dateKey]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleDelete = async (txn: Transaction) => {
    setPendingId(txn.id);
    await onDelete(txn);
    setPendingId(null);
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[60] flex items-end bg-black/60 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="mx-auto flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden sm:max-h-[calc(100vh-2rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="surface-card flex max-h-full flex-col overflow-hidden">
          <div className="border-b border-[--border] px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="kicker">Day</div>
                <h2 className="mt-1 truncate text-lg font-semibold sm:text-xl">{formatDateLabel(dateKey)}</h2>
              </div>
              <button onClick={onClose} className="btn-ghost inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm">
                <X size={14} /> Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat title="Income" value={formatMoney(summary.income)} accent="var(--accent)" />
              <MiniStat title="Spent" value={formatMoney(summary.spent)} accent="var(--danger)" />
              <MiniStat title="Transferred" value={formatMoney(summary.transferred)} accent="var(--accent-2)" />
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4 sm:px-5">
            {summary.list.length ? (
              summary.list.map((txn) => {
                const Icon = TYPE_ICON[txn.type];
                return (
                  <div key={txn.id} className="data-row flex items-center justify-between gap-3 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="surface-soft flex h-9 w-9 shrink-0 items-center justify-center">
                        <Icon size={16} style={{ color: TYPE_COLOR[txn.type] }} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{txn.note || 'No note'}</div>
                        <div className="truncate text-sm text-[--text-secondary]">
                          {accountMap.get(txn.account_id) ?? 'Unknown account'}
                          {txn.category_id ? ` · ${categoryMap.get(txn.category_id) ?? 'Unknown category'}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="font-mono text-sm" style={{ color: TYPE_COLOR[txn.type] }}>
                        {txn.type === 'expense' ? '-' : txn.type === 'income' ? '+' : ''}
                        {formatMoney(Number(txn.amount))}
                      </div>
                      <button
                        onClick={() => handleDelete(txn)}
                        disabled={pendingId === txn.id}
                        aria-label="Delete transaction"
                        className="btn-ghost p-2 text-[--danger] disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[--radius-sm] border border-dashed border-[--hairline] p-6 text-center text-sm text-[--text-muted]">
                No transactions on this day.
              </div>
            )}
          </div>

          <div className="border-t border-[--border] px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-[--text-secondary]">{summary.list.length} transaction{summary.list.length === 1 ? '' : 's'}</span>
              <div className="flex flex-wrap gap-2">
                <Link href="/transactions" className="btn-secondary text-sm">
                  Add transaction
                </Link>
                <Link href={`/whathappened?date=${dateKey}`} className="btn-primary inline-flex items-center gap-1.5 text-sm">
                  <ExternalLink size={14} /> Open full day
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function MiniStat({ title, value, accent }: { title: string; value: string; accent: string }) {
  return (
    <div className="surface-soft p-2.5">
      <div className="text-[11px] text-[--text-secondary]">{title}</div>
      <div className="mt-1 truncate font-mono text-sm" style={{ color: accent }}>{value}</div>
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
