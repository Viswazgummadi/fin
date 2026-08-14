"use client";

import { useMemo, useState } from 'react';
import type { Account, Transaction } from '../lib/types';
import { calculateAccountBalances } from '../lib/finance';
import { formatMoney } from '../lib/insights';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

export function AccountsClient({ initialAccounts, transactions }: { initialAccounts: Account[]; transactions: Transaction[] }) {
  const supabase = createSupabaseBrowserClient();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('bank');
  const [editingId, setEditingId] = useState<string | null>(null);
  const balances = useMemo(() => calculateAccountBalances(accounts, transactions), [accounts, transactions]);

  const reset = () => {
    setEditingId(null);
    setName('');
    setType('bank');
  };

  const addOrUpdate = async () => {
    if (!supabase || !name.trim()) return;
    if (editingId) {
      const { data, error } = await supabase.from('accounts').update({ name, type }).eq('id', editingId).select('*').single();
      if (!error && data) setAccounts(accounts.map((a) => (a.id === editingId ? data : a)));
      reset();
      return;
    }
    const { data, error } = await supabase.from('accounts').insert({ name, type }).select('*').single();
    if (!error && data) setAccounts([data, ...accounts]);
    reset();
  };

  const edit = (a: Account) => {
    setEditingId(a.id);
    setName(a.name);
    setType(a.type);
  };

  const archive = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('accounts').update({ archived: true }).eq('id', id);
    if (!error) setAccounts(accounts.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <input className="rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Account name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={type} onChange={(e) => setType(e.target.value as Account['type'])}>
          <option value="bank">Bank</option>
          <option value="cash">Cash</option>
          <option value="wallet">Wallet</option>
          <option value="credit">Credit</option>
          <option value="other">Other</option>
        </select>
        <button onClick={addOrUpdate} className="rounded-lg bg-accent px-4 py-2 font-medium text-black">{editingId ? 'Update' : 'Add'} account</button>
      </div>
      {editingId ? <button onClick={reset} className="text-sm text-text-secondary">Cancel edit</button> : null}
      <div className="space-y-2">
        {accounts.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-bg-secondary p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-sm text-text-secondary">{a.type} · Balance {formatMoney(balances.get(a.id) ?? 0)}</div>
                <div className="text-xs text-text-muted">Opening {formatMoney(Number(a.opening_balance || 0))}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => edit(a)} className="rounded-lg border border-border px-3 py-1 text-sm">Edit</button>
                <button onClick={() => archive(a.id)} className="rounded-lg border border-border px-3 py-1 text-sm">Archive</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
