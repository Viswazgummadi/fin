"use client";

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  History,
  ListChecks,
  Pencil,
  RotateCcw,
  Search as SearchIcon,
  Square,
  Tag as TagIcon,
  Trash2,
  X,
} from 'lucide-react';
import type { Account, Category, Tag, Transaction } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import {
  formatMoney,
  formatMonthLabel,
  getCurrentMonthKey,
  getMonthKey,
  getMonthRangeForQuery,
  shiftMonthKey,
  toDateKey,
} from '../lib/insights';
import { queryKeys } from '../lib/query-keys';
import { enqueueOfflineOutboxItem, isLocalOnlyTransactionId } from '../lib/offline-sync';
import { TransactionSuggestions } from './TransactionSuggestions';

type PlannedFilter = 'all' | 'planned' | 'unplanned';

const TRANSACTION_SELECT = 'id,account_id,transfer_account_id,type,amount,category_id,note,occurred_at,is_planned,deleted_at';

export function TransactionsClient({
  initialTransactions,
  initialMonthKey,
  accounts,
  categories,
}: {
  initialTransactions: Transaction[];
  initialMonthKey: string;
  accounts: Account[];
  categories: Category[];
}) {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);

  const [windowMonthKey, setWindowMonthKey] = useState(initialMonthKey);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [transferAccountId, setTransferAccountId] = useState(accounts.find((a) => a.id !== accounts[0]?.id)?.id ?? '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [type, setType] = useState<Transaction['type']>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isPlanned, setIsPlanned] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [recentlyDeleted, setRecentlyDeleted] = useState<Transaction[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('all');
  const [filterCategoryId, setFilterCategoryId] = useState('all');
  const [filterType, setFilterType] = useState<'all' | Transaction['type']>('all');
  const [filterPlanned, setFilterPlanned] = useState<PlannedFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [allTime, setAllTime] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const categoryOptions = useMemo(() => categories.filter((c) => c.kind === 'both' || c.kind === type), [categories, type]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const transferOptions = useMemo(() => accounts.filter((a) => a.id !== accountId), [accounts, accountId]);
  const windowRange = useMemo(() => getMonthRangeForQuery(windowMonthKey), [windowMonthKey]);
  const windowLabel = useMemo(() => (allTime ? 'All time' : formatMonthLabel(windowMonthKey)), [allTime, windowMonthKey]);
  const transactionsQueryKey = useMemo(
    () => [...queryKeys.transactionWindows, allTime ? 'all' : windowMonthKey] as const,
    [allTime, windowMonthKey]
  );

  const {
    data: transactions = initialTransactions,
    isFetching,
    error: loadError,
  } = useQuery({
    queryKey: transactionsQueryKey,
    queryFn: async () => {
      if (!supabase) return initialTransactions;

      let query = supabase.from('transactions').select(TRANSACTION_SELECT).is('deleted_at', null).order('occurred_at', { ascending: false });
      query = allTime
        ? query.limit(3000)
        : query.gte('occurred_at', windowRange.startIso).lt('occurred_at', windowRange.endIso).limit(500);

      const { data, error } = await query;
      if (error) throw error;
      return ((data as unknown) as Transaction[] | null) ?? [];
    },
    enabled: !!supabase,
    initialData: !allTime && windowMonthKey === initialMonthKey ? initialTransactions : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: tags = [] } = useQuery({
    queryKey: queryKeys.tags,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from('tags').select('*').order('name', { ascending: true });
      if (error) throw error;
      return (data as Tag[] | null) ?? [];
    },
    enabled: !!supabase,
    staleTime: 5 * 60_000,
  });

  const isEditingLocalTxn = editingId ? isLocalOnlyTransactionId(editingId) : false;

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((current) => (current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]));
  };

  // Lightweight lookup for showing tag chips on each row. Kept separate from the
  // transactions query itself (rather than joining transaction_tags into TRANSACTION_SELECT)
  // so the add/edit/delete/undo/optimistic-update state machine above keeps working with
  // plain `Transaction` values everywhere — this is purely additive display data, invalidated
  // together with the rest of the window under the shared `queryKeys.transactionWindows` prefix.
  const syncedTransactionIds = useMemo(
    () => transactions.map((t) => t.id).filter((id) => !isLocalOnlyTransactionId(id)),
    [transactions]
  );

  const { data: tagsByTransaction = {} } = useQuery({
    queryKey: [...queryKeys.transactionWindows, windowMonthKey, 'tags', syncedTransactionIds.join(',')],
    queryFn: async () => {
      if (!supabase || !syncedTransactionIds.length) return {};
      const { data, error } = await supabase
        .from('transaction_tags')
        .select('transaction_id, tags(id,name,color)')
        .in('transaction_id', syncedTransactionIds);
      if (error) throw error;
      const map: Record<string, Pick<Tag, 'id' | 'name' | 'color'>[]> = {};
      for (const row of (data ?? []) as unknown as { transaction_id: string; tags: Pick<Tag, 'id' | 'name' | 'color'> | null }[]) {
        if (!row.tags) continue;
        (map[row.transaction_id] ??= []).push(row.tags);
      }
      return map;
    },
    enabled: !!supabase && syncedTransactionIds.length > 0,
    staleTime: 30_000,
  });

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((txn) => {
      if (filterType !== 'all' && txn.type !== filterType) return false;
      if (filterAccountId !== 'all' && txn.account_id !== filterAccountId) return false;
      if (filterCategoryId !== 'all' && txn.category_id !== filterCategoryId) return false;
      if (filterPlanned === 'planned' && txn.is_planned === false) return false;
      if (filterPlanned === 'unplanned' && txn.is_planned !== false) return false;
      const day = toDateKey(txn.occurred_at);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (!q) return true;
      const haystack = [
        txn.note,
        txn.type,
        txn.amount,
        accountMap.get(txn.account_id),
        categoryMap.get(txn.category_id ?? ''),
        txn.transfer_account_id ? accountMap.get(txn.transfer_account_id) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [transactions, filterType, filterAccountId, filterCategoryId, filterPlanned, dateFrom, dateTo, search, accountMap, categoryMap]);

  const visibleStats = useMemo(() => {
    const income = filteredTransactions.filter((txn) => txn.type === 'income').reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
    const expense = filteredTransactions.filter((txn) => txn.type === 'expense').reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
    const transfers = filteredTransactions.filter((txn) => txn.type === 'transfer').length;
    return { income, expense, transfers };
  }, [filteredTransactions]);

  const activeFilterCount = useMemo(() => {
    return [
      filterAccountId !== 'all',
      filterCategoryId !== 'all',
      filterType !== 'all',
      filterPlanned !== 'all',
      Boolean(dateFrom),
      Boolean(dateTo),
      Boolean(search),
    ].filter(Boolean).length;
  }, [filterAccountId, filterCategoryId, filterType, filterPlanned, dateFrom, dateTo, search]);

  const setWindowTransactions = (updater: (current: Transaction[]) => Transaction[]) => {
    queryClient.setQueryData<Transaction[]>(transactionsQueryKey, (current) => updater(current ?? []));
  };

  const refreshTransactionWindows = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.transactionWindows });
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardTransactions });
    await queryClient.invalidateQueries({ queryKey: queryKeys.analysisTransactions });
    await queryClient.invalidateQueries({ queryKey: queryKeys.reviewTransactions });
    await queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
  };

  const upsertInCurrentWindow = (txn: Transaction) => {
    if (!allTime && getMonthKey(txn.occurred_at) !== windowMonthKey) return;
    setWindowTransactions((current) => [txn, ...current.filter((item) => item.id !== txn.id)]);
  };

  const buildOptimisticTransaction = (
    overrides: Partial<Transaction> & Pick<Transaction, 'account_id' | 'type' | 'amount' | 'occurred_at'>
  ): Transaction => ({
    id: overrides.id ?? `local-${crypto.randomUUID()}`,
    user_id: '',
    account_id: overrides.account_id,
    transfer_account_id: overrides.transfer_account_id ?? null,
    type: overrides.type,
    amount: overrides.amount,
    category_id: overrides.category_id ?? null,
    note: overrides.note ?? null,
    occurred_at: overrides.occurred_at,
    is_planned: overrides.is_planned ?? true,
    recurring_rule_id: null,
    created_at: overrides.created_at ?? overrides.occurred_at,
    updated_at: overrides.updated_at ?? overrides.occurred_at,
    deleted_at: overrides.deleted_at ?? null,
  });

  const resetForm = () => {
    setEditingId(null);
    setAmount('');
    setNote('');
    setType('expense');
    setIsPlanned(true);
    setCategoryId(categories[0]?.id ?? '');
    setAccountId(accounts[0]?.id ?? '');
    setTransferAccountId(accounts.find((a) => a.id !== accounts[0]?.id)?.id ?? '');
    setSelectedTagIds([]);
  };

  const addOrUpdateTransaction = async () => {
    if (!accountId) {
      setStatus('Create or select an account first.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setStatus('Enter a valid amount.');
      return;
    }
    if (type === 'transfer') {
      if (!transferAccountId) {
        setStatus('Choose a target account for this transfer.');
        return;
      }
      if (transferAccountId === accountId) {
        setStatus('Transfer source and target must be different.');
        return;
      }
    }

    const payload = {
      account_id: accountId,
      transfer_account_id: type === 'transfer' ? transferAccountId : null,
      type,
      amount,
      note: note || null,
      category_id: type === 'transfer' ? null : categoryId || null,
      is_planned: isPlanned,
    };

    // Tags need a real (already-synced) transaction id to attach to via `transaction_tags`.
    // Editing a transaction that itself is still a locally-queued optimistic row (a
    // `local-` id, not yet flushed from the offline outbox) has no real id yet, so its
    // tag selection is left untouched here — see PLAN.md P5 for the full reasoning.
    const tagIds = isEditingLocalTxn ? [] : selectedTagIds;

    const applyTagsForTransaction = async (transactionId: string) => {
      if (!supabase) return;
      const { error: clearError } = await supabase.from('transaction_tags').delete().eq('transaction_id', transactionId);
      if (clearError) {
        console.error('Failed to clear existing tags', clearError);
        return;
      }
      if (!tagIds.length) return;
      const { error: insertError } = await supabase
        .from('transaction_tags')
        .insert(tagIds.map((tagId) => ({ transaction_id: transactionId, tag_id: tagId })));
      if (insertError) console.error('Failed to save tags', insertError);
    };

    if (editingId) {
      if (!navigator.onLine || !supabase) {
        const optimistic = buildOptimisticTransaction({
          id: editingId,
          account_id: payload.account_id as string,
          transfer_account_id: (payload.transfer_account_id as string | null) ?? null,
          type: payload.type as Transaction['type'],
          amount: String(payload.amount),
          category_id: (payload.category_id as string | null) ?? null,
          note: (payload.note as string | null) ?? null,
          occurred_at: new Date().toISOString(),
          is_planned: payload.is_planned as boolean,
          updated_at: new Date().toISOString(),
        });
        upsertInCurrentWindow(optimistic);
        enqueueOfflineOutboxItem({
          id: crypto.randomUUID(),
          kind: 'transaction-update',
          transactionId: editingId,
          payload,
          tagIds: isEditingLocalTxn ? undefined : tagIds,
          createdAt: new Date().toISOString(),
        });
        setStatus('Update queued (offline).');
        resetForm();
        return;
      }

      setStatus('Saving...');
      const { data, error } = await supabase
        .from('transactions')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingId)
        .select(TRANSACTION_SELECT)
        .single();
      if (!error && data) {
        upsertInCurrentWindow(data as Transaction);
        if (!isEditingLocalTxn) await applyTagsForTransaction(editingId);
        await refreshTransactionWindows();
        setStatus('Transaction updated.');
        resetForm();
      } else {
        const optimistic = buildOptimisticTransaction({
          id: editingId,
          account_id: payload.account_id as string,
          transfer_account_id: (payload.transfer_account_id as string | null) ?? null,
          type: payload.type as Transaction['type'],
          amount: String(payload.amount),
          category_id: (payload.category_id as string | null) ?? null,
          note: (payload.note as string | null) ?? null,
          occurred_at: new Date().toISOString(),
          is_planned: payload.is_planned as boolean,
          updated_at: new Date().toISOString(),
        });
        upsertInCurrentWindow(optimistic);
        enqueueOfflineOutboxItem({
            id: crypto.randomUUID(),
            kind: 'transaction-update',
            transactionId: editingId,
            payload,
            tagIds: isEditingLocalTxn ? undefined : tagIds,
            createdAt: new Date().toISOString(),
          });
          setStatus('Update queued (connection error).');
          resetForm();
      }
      return;
    }

    if (!navigator.onLine || !supabase) {
        const optimistic = buildOptimisticTransaction({
          account_id: payload.account_id as string,
          transfer_account_id: (payload.transfer_account_id as string | null) ?? null,
          type: payload.type as Transaction['type'],
          amount: String(payload.amount),
          category_id: (payload.category_id as string | null) ?? null,
          note: (payload.note as string | null) ?? null,
          occurred_at: new Date().toISOString(),
          is_planned: payload.is_planned as boolean,
        });
        upsertInCurrentWindow(optimistic);
        enqueueOfflineOutboxItem({
          id: crypto.randomUUID(),
          kind: 'transaction-insert',
          payload,
          tagIds: tagIds.length ? tagIds : undefined,
          createdAt: new Date().toISOString(),
        });
        setStatus('Transaction queued (offline).');
        resetForm();
        return;
    }

    setStatus('Saving...');
    const { data, error } = await supabase.from('transactions').insert(payload).select(TRANSACTION_SELECT).single();
    if (!error && data) {
      upsertInCurrentWindow(data as Transaction);
      if (tagIds.length) await applyTagsForTransaction((data as Transaction).id);
      await refreshTransactionWindows();
      setStatus(
        getMonthKey((data as Transaction).occurred_at) === windowMonthKey
          ? 'Transaction added.'
          : 'Transaction added. Switch to the current month window to view it.'
      );
      resetForm();
    } else {
        const optimistic = buildOptimisticTransaction({
          account_id: payload.account_id as string,
          transfer_account_id: (payload.transfer_account_id as string | null) ?? null,
          type: payload.type as Transaction['type'],
          amount: String(payload.amount),
          category_id: (payload.category_id as string | null) ?? null,
          note: (payload.note as string | null) ?? null,
          occurred_at: new Date().toISOString(),
          is_planned: payload.is_planned as boolean,
        });
        upsertInCurrentWindow(optimistic);
        enqueueOfflineOutboxItem({
            id: crypto.randomUUID(),
            kind: 'transaction-insert',
            payload,
            tagIds: tagIds.length ? tagIds : undefined,
            createdAt: new Date().toISOString(),
          });
          setStatus('Transaction queued (connection error).');
          resetForm();
    }
  };

  const startEdit = async (txn: Transaction) => {
    setEditingId(txn.id);
    setAccountId(txn.account_id);
    setType(txn.type);
    setTransferAccountId(txn.transfer_account_id ?? '');
    setCategoryId(txn.category_id ?? '');
    setAmount(txn.amount);
    setNote(txn.note ?? '');
    setIsPlanned(txn.is_planned !== false);
    setSelectedTagIds([]);

    if (isLocalOnlyTransactionId(txn.id)) {
      setStatus('Editing transaction. Tags will be available once this finishes syncing.');
      return;
    }

    setStatus('Editing transaction.');
    if (!supabase) return;
    const { data, error } = await supabase.from('transaction_tags').select('tag_id').eq('transaction_id', txn.id);
    if (!error && data) {
      setSelectedTagIds((data as { tag_id: string }[]).map((row) => row.tag_id));
    }
  };

  const deleteTxns = async (txns: Transaction[]) => {
    if (!txns.length) return;
    const ids = txns.map((t) => t.id);
    const plural = txns.length > 1 ? 's' : '';

    if (!navigator.onLine || !supabase) {
      for (const txn of txns) {
        enqueueOfflineOutboxItem({
          id: crypto.randomUUID(),
          kind: 'transaction-soft-delete',
          transactionId: txn.id,
          createdAt: new Date().toISOString(),
        });
      }
      setWindowTransactions((current) => current.filter((item) => !ids.includes(item.id)));
      setRecentlyDeleted(txns);
      setStatus(`Delete queued (offline) — ${txns.length} transaction${plural}.`);
      return;
    }

    const { error } = await supabase.from('transactions').update({ deleted_at: new Date().toISOString() }).in('id', ids);
    if (!error) {
      setWindowTransactions((current) => current.filter((item) => !ids.includes(item.id)));
      setRecentlyDeleted(txns);
      await refreshTransactionWindows();
      setStatus(`Deleted ${txns.length} transaction${plural}.`);
    } else {
      for (const txn of txns) {
        enqueueOfflineOutboxItem({
          id: crypto.randomUUID(),
          kind: 'transaction-soft-delete',
          transactionId: txn.id,
          createdAt: new Date().toISOString(),
        });
      }
      setWindowTransactions((current) => current.filter((item) => !ids.includes(item.id)));
      setRecentlyDeleted(txns);
      setStatus(`Delete queued (connection error) — ${txns.length} transaction${plural}.`);
    }
  };

  const deleteTxn = (txn: Transaction) => deleteTxns([txn]);

  const undoDelete = async () => {
    if (!recentlyDeleted.length) return;
    const toRestore = recentlyDeleted;
    const ids = toRestore.map((t) => t.id);
    const plural = toRestore.length > 1 ? 's' : '';

    if (!navigator.onLine || !supabase) {
      for (const txn of toRestore) {
        enqueueOfflineOutboxItem({
          id: crypto.randomUUID(),
          kind: 'transaction-restore',
          transactionId: txn.id,
          createdAt: new Date().toISOString(),
        });
        upsertInCurrentWindow(txn);
      }
      setRecentlyDeleted([]);
      setStatus('Restore queued (offline).');
      return;
    }

    const { data, error } = await supabase.from('transactions').update({ deleted_at: null }).in('id', ids).select(TRANSACTION_SELECT);
    if (!error && data) {
      for (const row of data as Transaction[]) upsertInCurrentWindow(row);
      setRecentlyDeleted([]);
      await refreshTransactionWindows();
      setStatus(`Restored ${toRestore.length} transaction${plural}.`);
    } else {
      for (const txn of toRestore) {
        enqueueOfflineOutboxItem({
          id: crypto.randomUUID(),
          kind: 'transaction-restore',
          transactionId: txn.id,
          createdAt: new Date().toISOString(),
        });
        upsertInCurrentWindow(txn);
      }
      setRecentlyDeleted([]);
      setStatus('Restore queued (connection error).');
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const enterSelectMode = () => setSelectMode(true);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
  };

  const deleteSelected = async () => {
    const toDelete = filteredTransactions.filter((t) => selectedIds.has(t.id));
    if (!toDelete.length) return;
    await deleteTxns(toDelete);
    exitSelectMode();
  };

  const clearFilters = () => {
    setSearch('');
    setFilterAccountId('all');
    setFilterCategoryId('all');
    setFilterType('all');
    setFilterPlanned('all');
    setDateFrom('');
    setDateTo('');
    setAllTime(false);
  };

  useEffect(() => {
    if (selectMode) exitSelectMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowMonthKey, allTime]);

  const changeMonth = (value: string) => {
    setAllTime(false);
    setWindowMonthKey(value);
  };

  const filtersActive = activeFilterCount > 0;

  return (
    <div className="space-y-4 fade-up">
      {!selectMode ? <TransactionSuggestions transactions={transactions} categories={categories} /> : null}

      <section className="surface-card space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="kicker">Transactions</div>
            <div className="mt-1 font-semibold">{windowLabel}</div>
            <div className="text-sm text-[--text-secondary]">
              {filteredTransactions.length} of {transactions.length} shown{isFetching ? ' · refreshing…' : ''}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => changeMonth(shiftMonthKey(windowMonthKey, -1))}
              className="btn-secondary px-3 py-2 text-sm"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <input
              type="month"
              className="field w-auto py-2 text-sm"
              value={windowMonthKey}
              onChange={(e) => e.target.value && changeMonth(e.target.value)}
              aria-label="Jump to month"
            />
            <button
              onClick={() => changeMonth(shiftMonthKey(windowMonthKey, 1))}
              className="btn-secondary px-3 py-2 text-sm"
              disabled={!allTime && windowMonthKey >= currentMonthKey}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setAllTime((v) => !v)}
              className={`btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-sm ${allTime ? 'bg-[--accent-wash] text-[--text-primary]' : ''}`}
              aria-pressed={allTime}
              title="Show every transaction, not just this month"
            >
              <History size={16} />
              <span>All</span>
            </button>
            <button
              onClick={() => (selectMode ? exitSelectMode() : enterSelectMode())}
              className={`btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-sm ${selectMode ? 'bg-[--accent-wash] text-[--text-primary]' : ''}`}
              aria-pressed={selectMode}
            >
              <ListChecks size={16} />
              <span>{selectMode ? 'Cancel' : 'Select'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" />
            <input
              className="field pl-9 pr-9"
              placeholder="Search notes, amounts, accounts, categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[--text-muted] hover:text-[--text-primary]"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select className="field w-auto py-2 text-sm" value={filterAccountId} onChange={(e) => setFilterAccountId(e.target.value)}>
              <option value="all">All accounts</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
            <select className="field w-auto py-2 text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value as 'all' | Transaction['type'])}>
              <option value="all">All types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
            <select className="field w-auto py-2 text-sm" value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select className="field w-auto py-2 text-sm" value={filterPlanned} onChange={(e) => setFilterPlanned(e.target.value as PlannedFilter)}>
              <option value="all">Planned + unplanned</option>
              <option value="planned">Planned only</option>
              <option value="unplanned">Unplanned only</option>
            </select>
            <input className="field w-auto py-2 text-sm" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
            <input className="field w-auto py-2 text-sm" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
            {filtersActive ? (
              <button onClick={clearFilters} className="btn-ghost inline-flex items-center gap-1 text-sm">
                <X size={14} /> Clear filters
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat title="Shown" value={String(filteredTransactions.length)} />
          <Stat title="Income" value={formatMoney(visibleStats.income)} mono />
          <Stat title="Expense" value={formatMoney(visibleStats.expense)} mono />
          <Stat title="Transfers" value={String(visibleStats.transfers)} />
        </div>

        {loadError ? <div className="surface-soft px-3 py-2 text-sm text-[--danger]">{loadError instanceof Error ? loadError.message : 'Could not load this transaction window.'}</div> : null}
      </section>

      {!selectMode ? (
        <section className="surface-card space-y-3 p-4">
          <div>
            <div className="kicker">Manual entry</div>
            <div className="mt-1 font-semibold">Add or edit transaction</div>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <select className="field" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.length ? accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>) : <option value="">No accounts yet</option>}
            </select>
            <select className="field" value={type} onChange={(e) => setType(e.target.value as Transaction['type'])}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
            {type === 'transfer' ? (
              <select className="field" value={transferAccountId} onChange={(e) => setTransferAccountId(e.target.value)}>
                <option value="">Target account</option>
                {transferOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            ) : (
              <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categoryOptions.length ? categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>) : <option value="">No categories</option>}
              </select>
            )}
            <input className="field text-right font-mono" placeholder="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button onClick={addOrUpdateTransaction} className="btn-primary">{editingId ? 'Update transaction' : 'Add transaction'}</button>
          </div>
          <input className="field" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-[--text-secondary]">
            <input type="checkbox" checked={isPlanned} onChange={(e) => setIsPlanned(e.target.checked)} />
            Planned transaction
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="kicker">Tags</span>
              {!isEditingLocalTxn && tags.length ? (
                <Link href="/tags" className="text-xs text-[--accent]">Manage tags</Link>
              ) : null}
            </div>
            {isEditingLocalTxn ? (
              <p className="text-sm text-[--text-muted]">Tags will be available once this transaction finishes syncing.</p>
            ) : tags.length ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id);
                  const swatch = tag.color ?? 'var(--accent)';
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      aria-pressed={active}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
                      style={{
                        borderColor: active ? swatch : 'var(--border)',
                        background: active ? `${swatch}2e` : 'transparent',
                        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                        boxShadow: active ? `0 0 0 1px ${swatch}` : 'none',
                      }}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: swatch }} />
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[--text-muted]">
                No tags yet — <Link href="/tags" className="text-[--accent]">create some</Link> to organize transactions.
              </p>
            )}
          </div>

          {status ? <div className="surface-soft px-3 py-2 text-sm text-[--text-secondary]">{status}</div> : null}
          {editingId ? <button onClick={resetForm} className="btn-ghost w-fit text-sm">Cancel edit</button> : null}
        </section>
      ) : (
        <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-sm font-medium">
            {selectedIds.size ? `${selectedIds.size} selected` : 'Tap transactions below to select them'}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={selectAllVisible} className="btn-secondary text-sm" disabled={!filteredTransactions.length}>
              Select all ({filteredTransactions.length})
            </button>
            {selectedIds.size ? (
              <button onClick={() => setSelectedIds(new Set())} className="btn-ghost text-sm">
                Clear
              </button>
            ) : null}
          </div>
        </div>
      )}

      <AnimatePresence>
        {recentlyDeleted.length ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="surface-card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-[--text-secondary]">
                {recentlyDeleted.length === 1 ? (
                  <>
                    Deleted <span className="font-medium text-[--text-primary]">{recentlyDeleted[0].note || formatMoney(Number(recentlyDeleted[0].amount))}</span>.
                  </>
                ) : (
                  <>
                    Deleted <span className="font-medium text-[--text-primary]">{recentlyDeleted.length} transactions</span>.
                  </>
                )}{' '}
                Undo is available until the next delete.
              </div>
              <button onClick={undoDelete} className="btn-ghost inline-flex w-fit items-center gap-1.5 text-sm">
                <RotateCcw size={14} /> Undo delete
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className={`space-y-2 ${selectMode && selectedIds.size ? 'pb-40 lg:pb-24' : ''}`}>
        {filteredTransactions.length ? filteredTransactions.map((t) => {
          const rowTags = tagsByTransaction[t.id] ?? [];
          const isSelected = selectedIds.has(t.id);
          return (
          <div
            key={t.id}
            onClick={selectMode ? () => toggleSelected(t.id) : undefined}
            className={`data-row p-4 ${selectMode ? 'cursor-pointer' : ''} ${isSelected ? 'border-[--accent] ring-1 ring-[--accent]/40' : ''}`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                {selectMode ? (
                  <span className="mt-0.5 shrink-0 text-[--text-secondary]">
                    {isSelected ? <CheckSquare size={18} className="text-[--accent]" /> : <Square size={18} />}
                  </span>
                ) : null}
                <div className="min-w-0">
                  <div className="font-mono text-[--text-primary]">{formatMoney(Number(t.amount))} · {t.type}{t.is_planned === false ? ' · unplanned' : ''}</div>
                  <div className="mt-1 text-sm text-[--text-secondary]">
                    {t.type === 'transfer'
                      ? `${accountMap.get(t.account_id) ?? 'Unknown account'} → ${t.transfer_account_id ? accountMap.get(t.transfer_account_id) ?? 'Unknown target' : 'No target'}`
                      : `${accountMap.get(t.account_id) ?? 'Unknown account'}${t.category_id ? ` · ${categoryMap.get(t.category_id) ?? 'Unknown category'}` : ''}`}
                  </div>
                  <div className="mt-1 text-sm text-[--text-muted]">{t.note ?? 'No note'}</div>
                  {rowTags.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {rowTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                          style={{ background: `${tag.color ?? 'var(--accent)'}22`, color: 'var(--text-secondary)' }}
                        >
                          <TagIcon size={10} className="shrink-0" />
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              {!selectMode ? (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => startEdit(t)} className="btn-secondary inline-flex items-center gap-1.5 text-sm">
                    <Pencil size={14} /> Edit
                  </button>
                  <button onClick={() => deleteTxn(t)} className="btn-danger inline-flex items-center gap-1.5 text-sm">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          );
        }) : <div className="surface-card p-4 text-sm text-[--text-secondary]">No transactions match the current filters.</div>}
      </div>

      {selectMode && selectedIds.size ? (
        <SelectionBar count={selectedIds.size} onDelete={deleteSelected} onDone={exitSelectMode} />
      ) : null}
    </div>
  );
}

function SelectionBar({ count, onDelete, onDone }: { count: number; onDelete: () => void; onDone: () => void }) {
  // Rendered through a portal so this fixed bar stays pinned to the viewport rather than
  // the page-transition wrapper, which applies a CSS transform and would otherwise become
  // its containing block (see components/Sidebar.tsx for the same issue).
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="fixed inset-x-0 z-50 flex justify-center px-4 bottom-[calc(env(safe-area-inset-bottom)+9.25rem)] lg:bottom-6"
      >
        <div className="glass-1 flex items-center gap-3 rounded-full border border-[--border] px-4 py-2.5 shadow-lg">
          <span className="text-sm font-medium">{count} selected</span>
          <button onClick={onDelete} className="btn-danger inline-flex items-center gap-1.5 text-sm">
            <Trash2 size={14} /> Delete selected
          </button>
          <button onClick={onDone} className="btn-ghost text-sm">
            Done
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

function Stat({ title, value, mono = false }: { title: string; value: string; mono?: boolean }) {
  return (
    <div className="surface-soft p-3">
      <div className="kicker">{title}</div>
      <div className={`mt-1 text-xl ${mono ? 'font-mono' : 'font-semibold'}`}>{value}</div>
    </div>
  );
}
