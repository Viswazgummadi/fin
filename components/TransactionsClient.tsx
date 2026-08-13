"use client";

import { useMemo, useState } from 'react';
import type { Account, Category, Transaction } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

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
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [type, setType] = useState<Transaction['type']>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const categoryOptions = useMemo(() => categories.filter((c) => c.kind === 'both' || c.kind === type), [categories, type]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const resetForm = () => {
    setEditingId(null);
    setAmount('');
    setNote('');
    setType('expense');
    setCategoryId(categories[0]?.id ?? '');
    setAccountId(accounts[0]?.id ?? '');
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

    setStatus('Saving...');
    const payload: Record<string, unknown> = {
      account_id: accountId,
      type,
      amount,
      note: note || null,
      category_id: type === 'transfer' ? null : categoryId || null,
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
    setCategoryId(txn.category_id ?? '');
    setAmount(txn.amount);
    setNote(txn.note ?? '');
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <select className="rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.length ? accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>) : <option value="">No accounts yet</option>}
        </select>
        <select className="rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={type} onChange={(e) => setType(e.target.value as Transaction['type'])}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
        <select className="rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={type === 'transfer'}>
          {categoryOptions.length ? categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>) : <option value="">No categories</option>}
        </select>
        <input className="rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button onClick={addOrUpdateTransaction} className="rounded-lg bg-accent px-4 py-2 font-medium text-black">{editingId ? 'Update' : 'Add'} transaction</button>
      </div>
      <input className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
      {status ? <div className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-secondary">{status}</div> : null}
      {editingId ? <button onClick={resetForm} className="text-sm text-text-secondary">Cancel edit</button> : null}
      <div className="space-y-2">
        {transactions.length ? transactions.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-bg-secondary p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono">₹{Number(t.amount).toFixed(2)} · {t.type}</div>
                <div className="text-sm text-text-secondary">
                  {accountMap.get(t.account_id) ?? 'Unknown account'}
                  {t.category_id ? ` · ${categoryMap.get(t.category_id) ?? 'Unknown category'}` : ''}
                </div>
                <div className="text-sm text-text-secondary">{t.note ?? 'No note'}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(t)} className="rounded-lg border border-border px-3 py-1 text-sm">Edit</button>
                <button onClick={() => deleteTxn(t.id)} className="rounded-lg border border-border px-3 py-1 text-sm">Delete</button>
                <button onClick={() => undoDelete(t)} className="rounded-lg border border-border px-3 py-1 text-sm">Undo</button>
              </div>
            </div>
          </div>
        )) : <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-4 text-sm text-text-secondary">No transactions yet. Create starter data and add one to test the flow.</div>}
      </div>
    </div>
  );
}
