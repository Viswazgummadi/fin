"use client";

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Account, Category, Transaction } from '../lib/types';
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
import { enqueueOfflineOutboxItem } from '../lib/offline-sync';
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
  const [recentlyDeleted, setRecentlyDeleted] = useState<Transaction | null>(null);

  const [search, setSearch] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('all');
  const [filterCategoryId, setFilterCategoryId] = useState('all');
  const [filterType, setFilterType] = useState<'all' | Transaction['type']>('all');
  const [filterPlanned, setFilterPlanned] = useState<PlannedFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [popupMode, setPopupMode] = useState<'search' | 'filters' | null>(null);

  const categoryOptions = useMemo(() => categories.filter((c) => c.kind === 'both' || c.kind === type), [categories, type]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const transferOptions = useMemo(() => accounts.filter((a) => a.id !== accountId), [accounts, accountId]);
  const windowRange = useMemo(() => getMonthRangeForQuery(windowMonthKey), [windowMonthKey]);
  const windowLabel = useMemo(() => formatMonthLabel(windowMonthKey), [windowMonthKey]);
  const transactionsQueryKey = useMemo(() => [...queryKeys.transactionWindows, windowMonthKey] as const, [windowMonthKey]);

  const {
    data: transactions = initialTransactions,
    isFetching,
    error: loadError,
  } = useQuery({
    queryKey: transactionsQueryKey,
    queryFn: async () => {
      if (!supabase) return initialTransactions;

      const { data, error } = await supabase
        .from('transactions')
        .select(TRANSACTION_SELECT)
        .is('deleted_at', null)
        .gte('occurred_at', windowRange.startIso)
        .lt('occurred_at', windowRange.endIso)
        .order('occurred_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return ((data as unknown) as Transaction[] | null) ?? [];
    },
    enabled: !!supabase,
    initialData: windowMonthKey === initialMonthKey ? initialTransactions : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
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
    ].filter(Boolean).length;
  }, [filterAccountId, filterCategoryId, filterType, filterPlanned, dateFrom, dateTo]);

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
    if (getMonthKey(txn.occurred_at) !== windowMonthKey) return;
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
            createdAt: new Date().toISOString(),
          });
          setStatus('Transaction queued (connection error).');
          resetForm();
    }
  };

  const startEdit = (txn: Transaction) => {
    setEditingId(txn.id);
    setAccountId(txn.account_id);
    setType(txn.type);
    setTransferAccountId(txn.transfer_account_id ?? '');
    setCategoryId(txn.category_id ?? '');
    setAmount(txn.amount);
    setNote(txn.note ?? '');
    setIsPlanned(txn.is_planned !== false);
    setStatus('Editing transaction.');
  };

  const deleteTxn = async (txn: Transaction) => {
    if (!navigator.onLine || !supabase) {
        enqueueOfflineOutboxItem({
            id: crypto.randomUUID(),
            kind: 'transaction-soft-delete',
            transactionId: txn.id,
            createdAt: new Date().toISOString(),
          });
          setWindowTransactions((current) => current.filter((item) => item.id !== txn.id));
          setStatus('Delete queued (offline).');
          return;
    }

    const { error } = await supabase.from('transactions').update({ deleted_at: new Date().toISOString() }).eq('id', txn.id);
    if (!error) {
      setWindowTransactions((current) => current.filter((item) => item.id !== txn.id));
      setRecentlyDeleted(txn);
      await refreshTransactionWindows();
      setStatus('Transaction deleted.');
    } else {
        enqueueOfflineOutboxItem({
            id: crypto.randomUUID(),
            kind: 'transaction-soft-delete',
            transactionId: txn.id,
            createdAt: new Date().toISOString(),
          });
          setWindowTransactions((current) => current.filter((item) => item.id !== txn.id));
          setStatus('Delete queued (connection error).');
    }
  };

  const undoDelete = async () => {
    if (!recentlyDeleted) return;

    if (!navigator.onLine || !supabase) {
        enqueueOfflineOutboxItem({
            id: crypto.randomUUID(),
            kind: 'transaction-restore',
            transactionId: recentlyDeleted.id,
            createdAt: new Date().toISOString(),
          });
          upsertInCurrentWindow(recentlyDeleted);
          setRecentlyDeleted(null);
          setStatus('Restore queued (offline).');
          return;
    }

    const { data, error } = await supabase
      .from('transactions')
      .update({ deleted_at: null })
      .eq('id', recentlyDeleted.id)
      .select(TRANSACTION_SELECT)
      .single();
    if (!error && data) {
      upsertInCurrentWindow(data as Transaction);
      setRecentlyDeleted(null);
      await refreshTransactionWindows();
      setStatus('Transaction restored.');
    } else {
        enqueueOfflineOutboxItem({
            id: crypto.randomUUID(),
            kind: 'transaction-restore',
            transactionId: recentlyDeleted.id,
            createdAt: new Date().toISOString(),
          });
          upsertInCurrentWindow(recentlyDeleted);
          setRecentlyDeleted(null);
          setStatus('Restore queued (connection error).');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilterAccountId('all');
    setFilterCategoryId('all');
    setFilterType('all');
    setFilterPlanned('all');
    setDateFrom('');
    setDateTo('');
  };

  useEffect(() => {
    if (!popupMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPopupMode(null);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [popupMode]);

  const openSearch = () => setPopupMode('search');
  const openFilters = () => setPopupMode('filters');
  const closePopup = () => setPopupMode(null);

  const setQuickWindow = (direction: -1 | 0 | 1) => {
    if (direction === 0) {
      setWindowMonthKey(currentMonthKey);
      return;
    }
    setWindowMonthKey(shiftMonthKey(windowMonthKey, direction));
  };

  const popup = popupMode ? (
    <TransactionsPopup
      mode={popupMode}
      onClose={closePopup}
      onResetAll={() => {
        clearFilters();
        setWindowMonthKey(initialMonthKey);
      }}
      onQuickWindow={setQuickWindow}
      setWindowMonthKey={setWindowMonthKey}
      windowMonthKey={windowMonthKey}
      currentMonthKey={currentMonthKey}
      windowLabel={windowLabel}
      transactionsCount={transactions.length}
      search={search}
      setSearch={setSearch}
      activeFilterCount={activeFilterCount}
      accounts={accounts}
      categories={categories}
      filterAccountId={filterAccountId}
      setFilterAccountId={setFilterAccountId}
      filterType={filterType}
      setFilterType={setFilterType}
      filterPlanned={filterPlanned}
      setFilterPlanned={setFilterPlanned}
      filterCategoryId={filterCategoryId}
      setFilterCategoryId={setFilterCategoryId}
      dateFrom={dateFrom}
      setDateFrom={setDateFrom}
      dateTo={dateTo}
      setDateTo={setDateTo}
      filteredTransactionsCount={filteredTransactions.length}
      visibleStats={visibleStats}
    />
  ) : null;

  return (
    <div className="space-y-4 fade-up">
      <TransactionSuggestions transactions={transactions} categories={categories} />
      
      <section className="surface-card space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="kicker">Date window</div>
            <div className="mt-1 font-semibold">{windowLabel}</div>
            <div className="text-sm text-[--text-secondary]">Use popups for search and filters; the month stays one tap away.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setWindowMonthKey(shiftMonthKey(windowMonthKey, -1))} className="btn-secondary text-sm">
              ← Previous
            </button>
            <button onClick={openSearch} className="btn-primary text-sm">
              🔍 Search{search ? ' • on' : ''}
            </button>
            <button onClick={openFilters} className="btn-secondary text-sm">
              ⌄ Filters{activeFilterCount ? ` • ${activeFilterCount}` : ''}
            </button>
            <button onClick={() => setWindowMonthKey(currentMonthKey)} className="btn-ghost text-sm">
              This month
            </button>
            <button
              onClick={() => setWindowMonthKey(shiftMonthKey(windowMonthKey, 1))}
              className="btn-secondary text-sm"
              disabled={windowMonthKey >= currentMonthKey}
            >
              Next →
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat title="Window rows" value={String(transactions.length)} />
          <Stat title="Window month" value={windowMonthKey} mono />
          <Stat title="Load mode" value="Monthly cached" />
          <Stat title="Status" value={isFetching ? 'Refreshing…' : 'Cached'} />
        </div>

        {loadError ? <div className="surface-soft px-3 py-2 text-sm text-[--danger]">{loadError instanceof Error ? loadError.message : 'Could not load this transaction window.'}</div> : null}
      </section>

      <section className="surface-card space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="kicker">Search</div>
            <div className="mt-1 font-semibold">Filters & overview</div>
            <div className="text-sm text-[--text-secondary]">Tap the popup buttons to search or narrow results without keeping controls on screen.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={openSearch} className="btn-secondary text-sm">
              🔍 Search
            </button>
            <button onClick={openFilters} className="btn-secondary text-sm">
              ⌄ Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </button>
            {(activeFilterCount || search) ? <button onClick={clearFilters} className="btn-ghost text-sm">Clear</button> : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="surface-soft flex min-h-14 items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-[--text-muted]">Search & filters</div>
              <div className="truncate text-sm text-[--text-secondary]">
                {search ? `Searching “${search}”` : 'Tap search or filters to open a popup'}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={openSearch} className="btn-secondary shrink-0 px-4 py-2 text-sm">🔍</button>
              <button onClick={openFilters} className="btn-secondary shrink-0 px-4 py-2 text-sm">⌄</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex md:items-center">
            <Stat title="Rows" value={String(filteredTransactions.length)} />
            <Stat title="Expense" value={formatMoney(visibleStats.expense)} mono />
          </div>
        </div>
      </section>

      <section className="surface-card space-y-3 p-4">
        <div>
          <div className="kicker">Manual entry</div>
          <div className="mt-1 font-semibold">Add or edit transaction</div>
          <div className="text-sm text-[--text-secondary]">No separate Add page in the nav. Quick handles tiny spends; this section handles full manual entry.</div>
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
        {status ? <div className="surface-soft px-3 py-2 text-sm text-[--text-secondary]">{status}</div> : null}
        {editingId ? <button onClick={resetForm} className="btn-ghost w-fit text-sm">Cancel edit</button> : null}
      </section>

      {recentlyDeleted ? (
        <div className="surface-card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-[--text-secondary]">
            Deleted <span className="font-medium text-[--text-primary]">{recentlyDeleted.note || formatMoney(Number(recentlyDeleted.amount))}</span>. Undo is available until the next delete.
          </div>
          <button onClick={undoDelete} className="btn-ghost text-sm">Undo delete</button>
        </div>
      ) : null}

      <div className="space-y-2">
        {filteredTransactions.length ? filteredTransactions.map((t) => (
          <div key={t.id} className="data-row p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="font-mono text-[--text-primary]">{formatMoney(Number(t.amount))} · {t.type}{t.is_planned === false ? ' · unplanned' : ''}</div>
                <div className="mt-1 text-sm text-[--text-secondary]">
                  {t.type === 'transfer'
                    ? `${accountMap.get(t.account_id) ?? 'Unknown account'} → ${t.transfer_account_id ? accountMap.get(t.transfer_account_id) ?? 'Unknown target' : 'No target'}`
                    : `${accountMap.get(t.account_id) ?? 'Unknown account'}${t.category_id ? ` · ${categoryMap.get(t.category_id) ?? 'Unknown category'}` : ''}`}
                </div>
                <div className="mt-1 text-sm text-[--text-muted]">{t.note ?? 'No note'}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => startEdit(t)} className="btn-secondary text-sm">Edit</button>
                <button onClick={() => deleteTxn(t)} className="btn-danger text-sm">Delete</button>
              </div>
            </div>
          </div>
        )) : <div className="surface-card p-4 text-sm text-[--text-secondary]">No transactions match the current filters.</div>}
      </div>
      {popup}
    </div>
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

type TransactionsPopupProps = {
  mode: 'search' | 'filters';
  onClose: () => void;
  onResetAll: () => void;
  onQuickWindow: (direction: -1 | 0 | 1) => void;
  setWindowMonthKey: (value: string) => void;
  windowMonthKey: string;
  currentMonthKey: string;
  windowLabel: string;
  transactionsCount: number;
  search: string;
  setSearch: (value: string) => void;
  activeFilterCount: number;
  accounts: Account[];
  categories: Category[];
  filterAccountId: string;
  setFilterAccountId: (value: string) => void;
  filterType: 'all' | Transaction['type'];
  setFilterType: (value: 'all' | Transaction['type']) => void;
  filterPlanned: PlannedFilter;
  setFilterPlanned: (value: PlannedFilter) => void;
  filterCategoryId: string;
  setFilterCategoryId: (value: string) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  filteredTransactionsCount: number;
  visibleStats: { income: number; expense: number; transfers: number };
};

function TransactionsPopup({
  mode,
  onClose,
  onResetAll,
  onQuickWindow,
  setWindowMonthKey,
  windowMonthKey,
  currentMonthKey,
  windowLabel,
  transactionsCount,
  search,
  setSearch,
  activeFilterCount,
  accounts,
  categories,
  filterAccountId,
  setFilterAccountId,
  filterType,
  setFilterType,
  filterPlanned,
  setFilterPlanned,
  filterCategoryId,
  setFilterCategoryId,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  filteredTransactionsCount,
  visibleStats,
}: TransactionsPopupProps) {
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

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/60 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-4" onClick={onClose}>
      <div className="mx-auto flex h-full w-full max-w-4xl items-stretch" onClick={(event) => event.stopPropagation()}>
        <div className="surface-card flex max-h-[calc(100vh-1.5rem)] w-full flex-col overflow-hidden sm:max-h-[calc(100vh-2rem)]">
          <div className="border-b border-[--border] px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="kicker">Explore transactions</div>
                <h2 className="mt-1 text-lg font-semibold sm:text-xl">
                  {mode === 'search' ? 'Search transactions' : 'Filter transactions'}
                </h2>
                <p className="mt-1 text-sm text-[--text-secondary]">
                  {mode === 'search'
                    ? 'Quickly find notes, amounts, accounts, or categories in the current month.'
                    : 'Narrow the current month with account, type, category, planned state, and dates.'}
                </p>
              </div>
              <button onClick={onClose} className="btn-ghost shrink-0 px-3 py-2 text-sm">
                Close
              </button>
            </div>
          </div>

          <div className={`grid flex-1 gap-4 overflow-y-auto px-4 py-4 sm:px-5 ${mode === 'filters' ? 'lg:grid-cols-[1.1fr_1fr]' : ''}`}>
            <section className="space-y-4">
              {mode === 'filters' ? (
              <div className="surface-soft p-4">
                <div className="kicker">Date window</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => onQuickWindow(-1)} className="btn-secondary text-sm">
                    ← Previous
                  </button>
                  <button onClick={() => onQuickWindow(0)} className="btn-ghost text-sm">
                    This month
                  </button>
                  <button onClick={() => onQuickWindow(1)} className="btn-secondary text-sm" disabled={windowMonthKey >= currentMonthKey}>
                    Next →
                  </button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-[--text-secondary]">
                    Month
                    <input className="field" type="month" value={windowMonthKey} onChange={(e) => setWindowMonthKey(e.target.value)} />
                  </label>
                  <div className="surface-card p-4">
                    <div className="kicker">Current view</div>
                    <div className="mt-1 font-semibold">{windowLabel}</div>
                    <div className="mt-1 text-sm text-[--text-secondary]">{transactionsCount} rows loaded in this window</div>
                  </div>
                </div>
              </div>
              ) : null}

              <div className="surface-soft p-4">
                <div className="kicker">Search</div>
                <label className="mt-2 block text-sm text-[--text-secondary]">
                  Find by note, account, category, amount, or transfer target
                  <input
                    className="field mt-2"
                    placeholder="Search transactions"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus={mode === 'search'}
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {search ? <button onClick={() => setSearch('')} className="btn-ghost text-sm">Clear search</button> : null}
                </div>
              </div>
            </section>

            {mode === 'filters' ? (
              <section className="space-y-4">
                <div className="surface-soft p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="kicker">Filters</div>
                      <div className="mt-1 font-medium">Narrow results</div>
                    </div>
                    {activeFilterCount ? <span className="rounded-full border border-[--border] px-2.5 py-1 text-xs text-[--text-secondary]">{activeFilterCount} active</span> : null}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <select className="field" value={filterAccountId} onChange={(e) => setFilterAccountId(e.target.value)}>
                      <option value="all">All accounts</option>
                      {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                    </select>
                    <select className="field" value={filterType} onChange={(e) => setFilterType(e.target.value as 'all' | Transaction['type'])}>
                      <option value="all">All types</option>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                      <option value="transfer">Transfer</option>
                    </select>
                    <select className="field" value={filterPlanned} onChange={(e) => setFilterPlanned(e.target.value as PlannedFilter)}>
                      <option value="all">All planned states</option>
                      <option value="planned">Planned</option>
                      <option value="unplanned">Unplanned</option>
                    </select>
                    <select className="field" value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
                      <option value="all">All categories</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                    <input className="field" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <input className="field" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </div>

                <div className="surface-soft p-4">
                  <div className="kicker">Overview</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat title="Visible rows" value={String(filteredTransactionsCount)} />
                    <Stat title="Income" value={formatMoney(visibleStats.income)} mono />
                    <Stat title="Expense" value={formatMoney(visibleStats.expense)} mono />
                    <Stat title="Transfers" value={String(visibleStats.transfers)} />
                  </div>
                </div>
              </section>
            ) : (
              <section className="space-y-4">
                <div className="surface-soft p-4">
                  <div className="kicker">Overview</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat title="Visible rows" value={String(filteredTransactionsCount)} />
                    <Stat title="Income" value={formatMoney(visibleStats.income)} mono />
                    <Stat title="Expense" value={formatMoney(visibleStats.expense)} mono />
                    <Stat title="Transfers" value={String(visibleStats.transfers)} />
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="border-t border-[--border] px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[--text-secondary]">{activeFilterCount || search ? 'Filters are active.' : 'No filters applied.'}</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={onResetAll} className="btn-ghost text-sm">
                  Reset all
                </button>
                <button onClick={onClose} className="btn-primary text-sm">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
