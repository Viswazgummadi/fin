"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import type { Account, Category, Transaction } from '../lib/types';

export function MainAddClient({ accounts, categories }: { accounts: Account[]; categories: Category[] }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [transferAccountId, setTransferAccountId] = useState(accounts.find((account) => account.id !== accounts[0]?.id)?.id ?? '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [type, setType] = useState<Transaction['type']>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isPlanned, setIsPlanned] = useState(true);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const categoryOptions = useMemo(() => categories.filter((category) => category.kind === 'both' || category.kind === type), [categories, type]);
  const transferOptions = useMemo(() => accounts.filter((account) => account.id !== accountId), [accounts, accountId]);

  const save = async () => {
    if (!supabase) {
      setStatus('Supabase is not configured in this environment.');
      return;
    }
    if (!accountId || !amount || Number(amount) <= 0) {
      setStatus('Choose an account and enter a valid amount.');
      return;
    }
    if (type === 'transfer' && (!transferAccountId || transferAccountId === accountId)) {
      setStatus('Choose a different target account for the transfer.');
      return;
    }

    setSaving(true);
    setStatus('Saving...');
    const { error } = await supabase.from('transactions').insert({
      account_id: accountId,
      transfer_account_id: type === 'transfer' ? transferAccountId : null,
      category_id: type === 'transfer' ? null : categoryId || null,
      type,
      amount,
      note: note.trim() || null,
      is_planned: isPlanned,
    });

    setSaving(false);
    if (error) {
      setStatus(error.message);
      return;
    }

    setAmount('');
    setNote('');
    setStatus('Transaction added.');
    router.refresh();
  };

  return (
    <section className="space-y-5 rounded-xl border border-[--border] bg-[--bg-secondary] p-4 md:p-5">
      <div>
        <h1 className="text-3xl font-semibold">Add transaction</h1>
        <p className="mt-2 text-sm text-[--text-secondary]">Use this for the full transaction flow. Quick add in the header is for tiny everyday spends.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <select className="rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-3 py-3" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.length ? accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>) : <option value="">No accounts yet</option>}
        </select>

        <select className="rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-3 py-3" value={type} onChange={(e) => setType(e.target.value as Transaction['type'])}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>

        {type === 'transfer' ? (
          <select className="rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-3 py-3" value={transferAccountId} onChange={(e) => setTransferAccountId(e.target.value)}>
            <option value="">Target account</option>
            {transferOptions.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        ) : (
          <select className="rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-3 py-3" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categoryOptions.length ? categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>) : <option value="">No categories</option>}
          </select>
        )}

        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Amount" className="rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-3 py-3 text-right font-mono" />

        <label className="flex items-center gap-2 rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-3 py-3 text-sm text-[--text-secondary]">
          <input type="checkbox" checked={isPlanned} onChange={(e) => setIsPlanned(e.target.checked)} />
          Planned
        </label>
      </div>

      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className="w-full rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-3 py-3" />

      {status ? <div className="text-sm text-[--text-secondary]">{status}</div> : null}

      <div className="flex flex-wrap gap-3">
        <button disabled={saving} onClick={save} className="rounded-[--radius] bg-[--accent] px-4 py-3 font-semibold text-[--bg-primary] disabled:opacity-60">
          {saving ? 'Saving...' : 'Save transaction'}
        </button>
      </div>
    </section>
  );
}
