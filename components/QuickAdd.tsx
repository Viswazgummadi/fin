"use client";

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import type { Account } from '../lib/types';

const templates = [
  { label: 'Metro', note: 'Metro - office one way', amount: 40 },
  { label: 'Tea', note: 'Tea', amount: 20 },
  { label: 'Lunch', note: 'Lunch', amount: 150 },
  { label: 'Cab', note: 'Cab', amount: 300 },
];

export function QuickAdd({ onSuccess }: { onSuccess?: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
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
    mutationFn: async (data: { amount: number; note: string; type: 'expense' | 'income'; account_id: string }) => {
        if (!supabase) throw new Error('Supabase not configured');
        const { data: result, error } = await supabase.from('transactions').insert([
            {
                amount: data.amount,
                note: data.note.trim() || null,
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
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        setAmount('');
        setNote('');
        onSuccess?.();
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return alert('Select an account');
    mutation.mutate({ amount: Number(amount), note, type, account_id: accountId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-xs uppercase tracking-wide text-[--text-muted]">Quick templates</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {templates.map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => {
                setNote(template.note);
                setAmount(String(template.amount));
                setType('expense');
              }}
              className="rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-3 py-2 text-left hover:border-[--accent]"
            >
              <div className="text-sm font-medium">{template.label}</div>
              <div className="text-xs text-[--text-muted]">{template.note}</div>
              <div className="mt-1 font-mono text-sm">₹{template.amount}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.6fr_0.9fr]">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-4 py-3 outline-none"
          placeholder="Metro / office one way"
        />
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-4 py-3 text-right text-2xl font-mono outline-none"
          placeholder="0.00"
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.2fr]">
        <button type="button" onClick={() => setType('expense')} className={`rounded-[--radius] px-4 py-3 ${type === 'expense' ? 'bg-[--danger] text-white' : 'border border-[--border] bg-[--bg-tertiary]'}`}>Expense</button>
        <button type="button" onClick={() => setType('income')} className={`rounded-[--radius] px-4 py-3 ${type === 'income' ? 'bg-[--accent] text-[--bg-primary]' : 'border border-[--border] bg-[--bg-tertiary]'}`}>Income</button>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-3 py-3" required>
          {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {mutation.error ? <div className="text-sm text-[--danger]">{mutation.error instanceof Error ? mutation.error.message : 'Could not add transaction.'}</div> : null}

      <button type="submit" disabled={mutation.isPending} className="w-full rounded-[--radius] bg-[--accent] px-4 py-3 font-semibold text-[--bg-primary]">
        {mutation.isPending ? 'Saving...' : 'Done'}
      </button>
    </form>
  );
}
