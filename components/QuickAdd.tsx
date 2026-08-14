"use client";

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import type { Account } from '../lib/types';

export function QuickAdd() {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [accountId, setAccountId] = useState('');
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase.from('accounts').select('*').eq('archived', false);
      return data as Account[] || [];
    },
    enabled: !!supabase,
  });

  useEffect(() => {
    if (accounts && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const mutation = useMutation({
    mutationFn: async (data: { amount: number; type: 'expense' | 'income'; account_id: string }) => {
        if (!supabase) throw new Error('Supabase not configured');
        const { data: result, error } = await supabase.from('transactions').insert([
            {
                amount: data.amount,
                type: data.type,
                account_id: data.account_id,
                occurred_at: new Date().toISOString(),
                is_planned: true,
            }
        ]);
        if (error) throw error;
        return result;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        setAmount('');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return alert('Select an account');
    mutation.mutate({ amount: Number(amount), type, account_id: accountId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-bg-secondary p-6">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full rounded-lg bg-bg-tertiary p-4 text-3xl font-mono"
        placeholder="0.00"
        required
      />
      <div className="flex gap-2">
        <button type="button" onClick={() => setType('expense')} className={`flex-1 rounded-lg px-4 py-2 ${type === 'expense' ? 'bg-danger text-white' : 'bg-bg-tertiary'}`}>Expense</button>
        <button type="button" onClick={() => setType('income')} className={`flex-1 rounded-lg px-4 py-2 ${type === 'income' ? 'bg-accent text-white' : 'bg-bg-tertiary'}`}>Income</button>
      </div>
      <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded-lg bg-bg-tertiary p-3" required>
        {accounts?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <button type="submit" disabled={mutation.isPending} className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-black">
        {mutation.isPending ? 'Adding...' : 'Add'}
      </button>
    </form>
  );
}
