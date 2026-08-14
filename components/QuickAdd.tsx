"use client";

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import type { Account } from '../lib/types';
import {
  DEFAULT_QUICK_SPEND_TEMPLATES,
  QUICK_SPEND_EVENT,
  readQuickSpendConfig,
  type QuickSpendTemplate,
} from '../lib/quick-spend';
import { queryKeys } from '../lib/query-keys';

export function QuickAdd({ onSuccess }: { onSuccess?: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState('');
  const [templates, setTemplates] = useState<QuickSpendTemplate[]>(DEFAULT_QUICK_SPEND_TEMPLATES);
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase.from('accounts').select('*').eq('archived', false);
      return data as Account[] || [];
    },
    enabled: !!supabase,
  });

  useEffect(() => {
    if (!accounts?.length) return;

    const syncFromConfig = () => {
      const config = readQuickSpendConfig();
      setTemplates(config.templates.length ? config.templates : DEFAULT_QUICK_SPEND_TEMPLATES);
      const fallbackAccountId = accounts[0]?.id ?? '';
      const configured = config.defaultAccountId && accounts.some((account) => account.id === config.defaultAccountId)
        ? config.defaultAccountId
        : fallbackAccountId;
      setAccountId(configured);
    };

    syncFromConfig();
    window.addEventListener(QUICK_SPEND_EVENT, syncFromConfig);
    return () => window.removeEventListener(QUICK_SPEND_EVENT, syncFromConfig);
  }, [accounts]);

  const mutation = useMutation({
    mutationFn: async (data: { amount: number; note: string; account_id: string }) => {
        if (!supabase) throw new Error('Supabase not configured');
        const { data: result, error } = await supabase.from('transactions').insert([
            {
                amount: data.amount,
                note: data.note.trim() || null,
                type: 'expense',
                account_id: data.account_id,
                occurred_at: new Date().toISOString(),
                is_planned: false,
            }
        ]);
        if (error) throw error;
        return result;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.transactionWindows });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardTransactions });
        queryClient.invalidateQueries({ queryKey: queryKeys.analysisTransactions });
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
        setAmount('');
        setNote('');
        onSuccess?.();
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return alert('Set a default quick-spend account from Manage first.');
    mutation.mutate({ amount: Number(amount), note, account_id: accountId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-xs uppercase tracking-wide text-[--text-muted]">Quick templates</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                setNote(template.note);
                setAmount(String(template.amount));
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

      <div className="rounded-[--radius] border border-[--border] bg-[--bg-primary]/40 px-3 py-3 text-sm text-[--text-secondary]">
        Quick add saves a small <span className="font-medium text-[--text-primary]">expense</span>{' '}
        {accountId && accounts?.length ? (
          <>into <span className="font-medium text-[--text-primary]">{accounts.find((account) => account.id === accountId)?.name ?? 'your default account'}</span>.</>
        ) : (
          <>after you set a default account in <span className="font-medium text-[--text-primary]">Manage</span>.</>
        )}
      </div>

      {mutation.error ? <div className="text-sm text-[--danger]">{mutation.error instanceof Error ? mutation.error.message : 'Could not add transaction.'}</div> : null}

      <button type="submit" disabled={mutation.isPending} className="w-full rounded-[--radius] bg-[--accent] px-4 py-3 font-semibold text-[--bg-primary]">
        {mutation.isPending ? 'Saving...' : 'Done'}
      </button>
    </form>
  );
}
