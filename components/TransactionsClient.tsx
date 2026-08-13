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

  const categoryOptions = useMemo(() => categories.filter((c) => c.kind === 'both' || c.kind === type || (type === 'transfer' && true)), [categories, type]);

  const addTransaction = async () => {
    if (!supabase || !accountId || !amount) return;
    const payload: Record<string, unknown> = {
      account_id: accountId,
      type,
      amount,
      note,
      category_id: type === 'transfer' ? null : categoryId || null,
    };
    const { data, error } = await supabase.from('transactions').insert(payload).select('*').single();
    if (!error && data) setTransactions([data, ...transactions]);
    setAmount('');
    setNote('');
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
        <button onClick={addTransaction} className="rounded-lg bg-accent px-4 py-2 font-medium text-black">Add transaction</button>
      </div>
      <input className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="space-y-2">
        {transactions.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-bg-secondary p-4">
            <div className="font-mono">{t.amount} · {t.type}</div>
            <div className="text-sm text-text-secondary">{t.note ?? 'No note'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
