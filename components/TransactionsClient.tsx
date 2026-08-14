"use client";

import { useMemo, useState } from 'react';
import type { Account, Category, Transaction } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { formatMoney, toDateKey } from '../lib/insights';

type PlannedFilter = 'all' | 'planned' | 'unplanned';

export function TransactionsClient({
  initialTransactions,
  accounts,
  categories,
}: {
  initialTransactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}) {
  const supabase = createSupabaseBrowserClient();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [transferAccountId, setTransferAccountId] = useState(accounts.find((a) => a.id !== accounts[0]?.id)?.id ?? '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [type, setType] = useState<Transaction['type']>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isPlanned, setIsPlanned] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const [search, setSearch] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('all');
  const [filterCategoryId, setFilterCategoryId] = useState('all');
  const [filterType, setFilterType] = useState<'all' | Transaction['type']>('all');
  const [filterPlanned, setFilterPlanned] = useState<PlannedFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const categoryOptions = useMemo(() => categories.filter((c) => c.kind === 'both' || c.kind === type), [categories, type]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const transferOptions = useMemo(() => accounts.filter((a) => a.id !== accountId), [accounts, accountId]);

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
    if (!supabase) {
      setStatus('Supabase is not configured in this environment.');
      return;
    }
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

    setStatus('Saving...');
    const payload: Record<string, unknown> = {
      account_id: accountId,
      transfer_account_id: type === 'transfer' ? transferAccountId : null,
      type,
      amount,
      note: note || null,
      category_id: type === 'transfer' ? null : categoryId || null,
      is_planned: isPlanned,
    };

    if (editingId) {
      const { data, error } = await supabase
        .from('transactions')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingId)
        .select('*')
        .single();
      if (!error && data) {
        setTransactions(transactions.map((t) => (t.id === editingId ? data : t)));
        setStatus('Transaction updated.');
        resetForm();
      } else {
        setStatus(error?.message ?? 'Could not update transaction.');
      }
      return;
    }

    const { data, error } = await supabase.from('transactions').insert(payload).select('*').single();
    if (!error && data) {
      setTransactions([data, ...transactions]);
      setStatus('Transaction added.');
      resetForm();
    } else {
      setStatus(error?.message ?? 'Could not add transaction.');
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

  const deleteTxn = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('transactions').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (!error) {
      setTransactions(transactions.filter((t) => t.id !== id));
      setStatus('Transaction deleted.');
    } else {
      setStatus(error.message);
    }
  };

  const undoDelete = async (txn: Transaction) => {
    if (!supabase) return;
    const { data, error } = await supabase.from('transactions').update({ deleted_at: null }).eq('id', txn.id).select('*').single();
    if (!error && data) {
      setTransactions([data, ...transactions]);
      setStatus('Transaction restored.');
    } else {
      setStatus(error?.message ?? 'Could not restore transaction.');
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

  return (
    <div className="space-y-4 fade-up">
      <section className="surface-card space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="kicker">Search</div>
            <div className="mt-1 font-semibold">Filters & overview</div>
            <div className="text-sm text-[--text-secondary]">Search note, account, category, amount, or transfer target.</div>
          </div>
          <button onClick={clearFilters} className="btn-secondary text-sm">Clear filters</button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input className="field xl:col-span-2" placeholder="Search transactions" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="field" value={filterAccountId} onChange={(e) => setFilterAccountId(e.target.value)}>
            <option value="all">All accounts</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          <select className="field" value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)}>
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

        <div className="grid gap-3 md:grid-cols-4">
          <Stat title="Visible rows" value={String(filteredTransactions.length)} />
          <Stat title="Income" value={formatMoney(visibleStats.income)} mono />
          <Stat title="Expense" value={formatMoney(visibleStats.expense)} mono />
          <Stat title="Transfers" value={String(visibleStats.transfers)} />
        </div>
      </section>

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
              {categoryOptions.length ? categories.filter((c) => c.kind === 'both' || c.kind === type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>) : <option value="">No categories</option>}
            </select>
          )}
          <input className="field text-right font-mono" placeholder="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button onClick={addOrUpdateTransaction} className="btn-primary">{editingId ? 'Update' : 'Add'} transaction</button>
        </div>
        <input className="field" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-[--text-secondary]">
          <input type="checkbox" checked={isPlanned} onChange={(e) => setIsPlanned(e.target.checked)} />
          Planned transaction
        </label>
        {status ? <div className="surface-soft px-3 py-2 text-sm text-[--text-secondary]">{status}</div> : null}
        {editingId ? <button onClick={resetForm} className="btn-ghost w-fit text-sm">Cancel edit</button> : null}
      </section>

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
                <button onClick={() => deleteTxn(t.id)} className="btn-danger text-sm">Delete</button>
                <button onClick={() => undoDelete(t)} className="btn-ghost text-sm">Undo</button>
              </div>
            </div>
          </div>
        )) : <div className="surface-card p-4 text-sm text-[--text-secondary]">No transactions match the current filters.</div>}
      </div>
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
