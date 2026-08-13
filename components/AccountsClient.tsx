"use client";

import { useState } from 'react';
import type { Account } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

export function AccountsClient({ initialAccounts }: { initialAccounts: Account[] }) {
  const supabase = createSupabaseBrowserClient();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('bank');

  const addAccount = async () => {
    if (!supabase || !name.trim()) return;
    const { data, error } = await supabase.from('accounts').insert({ name, type }).select('*').single();
    if (!error && data) setAccounts([data, ...accounts]);
    setName('');
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
        <button onClick={addAccount} className="rounded-lg bg-accent px-4 py-2 font-medium text-black">Add account</button>
      </div>
      <div className="space-y-2">
        {accounts.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-bg-secondary p-4">
            <div className="font-medium">{a.name}</div>
            <div className="text-sm text-text-secondary">{a.type} · Opening balance {a.opening_balance}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
