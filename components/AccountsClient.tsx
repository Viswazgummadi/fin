"use client";

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Landmark, Banknote, Wallet as WalletIcon, CreditCard, CircleDollarSign } from 'lucide-react';
import type { Account, Transaction } from '../lib/types';
import { calculateAccountBalances } from '../lib/finance';
import { formatMoney } from '../lib/insights';
import { queryKeys } from '../lib/query-keys';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

const TYPE_ICON: Record<Account['type'], typeof Landmark> = {
  bank: Landmark,
  cash: Banknote,
  wallet: WalletIcon,
  credit: CreditCard,
  other: CircleDollarSign,
};

export function AccountsClient({ initialAccounts, transactions }: { initialAccounts: Account[]; transactions: Transaction[] }) {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('bank');
  const [editingId, setEditingId] = useState<string | null>(null);
  const balances = useMemo(() => calculateAccountBalances(accounts, transactions), [accounts, transactions]);
  const totalBalance = useMemo(() => [...balances.values()].reduce((sum, v) => sum + v, 0), [balances]);

  const reset = () => {
    setEditingId(null);
    setName('');
    setType('bank');
  };

  const addOrUpdate = async () => {
    if (!supabase || !name.trim()) return;
    if (editingId) {
      const { data, error } = await supabase.from('accounts').update({ name, type }).eq('id', editingId).select('*').single();
      if (!error && data) {
        setAccounts(accounts.map((a) => (a.id === editingId ? data : a)));
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      }
      reset();
      return;
    }
    const { data, error } = await supabase.from('accounts').insert({ name, type }).select('*').single();
    if (!error && data) {
      setAccounts([data, ...accounts]);
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    }
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
    if (!error) {
      setAccounts(accounts.filter((a) => a.id !== id));
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    }
  };

  return (
    <div className="space-y-4">
      {accounts.length ? (
        <div className="surface-card p-4">
          <div className="text-sm text-[--text-secondary]">Total across {accounts.length} account{accounts.length === 1 ? '' : 's'}</div>
          <div className="mt-2 font-mono text-2xl">{formatMoney(totalBalance)}</div>
        </div>
      ) : null}

      <section className="surface-card p-4">
        <div className="mb-3">
          <div className="kicker">Structure</div>
          <div className="mt-1 font-medium">{editingId ? 'Edit account' : 'Create account'}</div>
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
        {accounts.length ? accounts.map((a) => {
          const Icon = TYPE_ICON[a.type];
          const balance = balances.get(a.id) ?? 0;
          return (
            <div key={a.id} className="data-row flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="surface-soft flex h-10 w-10 shrink-0 items-center justify-center">
                  <Icon size={18} className="text-[--accent-2]" />
                </span>
                <div className="min-w-0">
                  <div className="font-medium">{a.name}</div>
                  <div className="mt-0.5 text-sm capitalize text-[--text-secondary]">
                    {a.type} · <span className="font-mono text-[--text-primary]">{formatMoney(balance)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-[--text-muted]">Opening {formatMoney(Number(a.opening_balance || 0))}</div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => edit(a)} className="btn-secondary text-sm">Edit</button>
                <button onClick={() => archive(a.id)} className="btn-ghost text-sm">Archive</button>
              </div>
            </div>
          );
        }) : <EmptyState text="No accounts yet. Add your first account above." />}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[--radius-sm] border border-dashed border-[--hairline] p-6 text-center text-sm text-[--text-muted]">{text}</div>;
}
