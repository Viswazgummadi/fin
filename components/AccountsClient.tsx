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
    <div className="space-y-4 fade-up">
      <section className="surface-card p-4">
        <div className="mb-3">
          <div className="kicker">Structure</div>
          <div className="mt-1 font-medium">Create or edit account</div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <input className="field" placeholder="Account name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="field" value={type} onChange={(e) => setType(e.target.value as Account['type'])}>
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
            <option value="wallet">Wallet</option>
            <option value="credit">Credit</option>
            <option value="other">Other</option>
          </select>
          <button onClick={addOrUpdate} className="btn-primary">{editingId ? 'Update' : 'Add'} account</button>
        </div>
        {editingId ? <button onClick={reset} className="btn-ghost mt-2 text-sm">Cancel edit</button> : null}
      </section>

      <div className="grid gap-3">
        {accounts.map((a) => (
          <div key={a.id} className="surface-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="mt-1 text-sm text-[--text-secondary]">{a.type} · Balance <span className="font-mono text-[--text-primary]">{formatMoney(balances.get(a.id) ?? 0)}</span></div>
                <div className="mt-1 text-xs text-[--text-muted]">Opening {formatMoney(Number(a.opening_balance || 0))}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => edit(a)} className="btn-secondary text-sm">Edit</button>
                <button onClick={() => archive(a.id)} className="btn-ghost text-sm">Archive</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
