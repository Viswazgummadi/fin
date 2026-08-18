"use client";

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import type { Account } from '../lib/types';
import {
  DEFAULT_QUICK_SPEND_TEMPLATES,
  QUICK_SPEND_EVENT,
  normalizeQuickSpendConfig,
  readQuickSpendConfig,
  saveQuickSpendConfig,
  type QuickSpendTemplate,
  addToQuickSpendHistory,
  QuickSpendHistoryItem,
} from '../lib/quick-spend';
import { queryKeys } from '../lib/query-keys';
import { enqueueOfflineOutboxItem, fetchRemoteQuickSpendConfig } from '../lib/offline-sync';
import { QuickSpendHistory } from './QuickSpendHistory';

export function QuickAdd({ onSuccess }: { onSuccess?: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState('');
  const [templates, setTemplates] = useState<QuickSpendTemplate[]>(DEFAULT_QUICK_SPEND_TEMPLATES);
  const [status, setStatus] = useState('');
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase.from('accounts').select('*').eq('archived', false);
      return (data as Account[]) || [];
    },
    enabled: !!supabase,
  });

  const { data: quickSpendConfig } = useQuery({
    queryKey: queryKeys.quickSpendConfig,
    queryFn: async () => {
      if (!supabase) return readQuickSpendConfig();
      const remoteConfig = await fetchRemoteQuickSpendConfig(supabase);
      const normalized = normalizeQuickSpendConfig(remoteConfig ?? readQuickSpendConfig());
      saveQuickSpendConfig(normalized);
      return normalized;
    },
    enabled: !!accounts?.length,
    initialData: readQuickSpendConfig(),
  });

  useEffect(() => {
    if (!accounts?.length) return;

    const syncFromConfig = () => {
      const config = normalizeQuickSpendConfig(quickSpendConfig ?? readQuickSpendConfig(), accounts[0]?.id ?? '');
      setTemplates(config.templates.length ? config.templates : DEFAULT_QUICK_SPEND_TEMPLATES);
      const fallbackAccountId = accounts[0]?.id ?? '';
      const configured =
        config.defaultAccountId && accounts.some((account) => account.id === config.defaultAccountId)
          ? config.defaultAccountId
          : fallbackAccountId;
      setAccountId(configured);
    };

    syncFromConfig();
    window.addEventListener(QUICK_SPEND_EVENT, syncFromConfig);
    return () => window.removeEventListener(QUICK_SPEND_EVENT, syncFromConfig);
  }, [accounts, quickSpendConfig]);

  const mutation = useMutation({
    mutationFn: async (data: { amount: number; note: string; account_id: string }) => {
      const payload = {
        amount: String(data.amount),
        note: data.note.trim() || null,
        type: 'expense' as const,
        account_id: data.account_id,
        transfer_account_id: null,
        category_id: null,
        occurred_at: new Date().toISOString(),
        is_planned: false,
      };

      if (!navigator.onLine || !supabase) {
        enqueueOfflineOutboxItem({
          id: crypto.randomUUID(),
          kind: 'transaction-insert',
          payload,
          createdAt: new Date().toISOString(),
        });
        return { offline: true };
      }

      const { data: result, error } = await supabase.from('transactions').insert([payload]);
      if (error) {
        enqueueOfflineOutboxItem({
          id: crypto.randomUUID(),
          kind: 'transaction-insert',
          payload,
          createdAt: new Date().toISOString(),
        });
        return { offline: true };
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactionWindows });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardTransactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.analysisTransactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewTransactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      setAmount('');
      setNote('');
      onSuccess?.();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      setStatus('Set a default quick-spend account in Manage first.');
      return;
    }
    
    // Add to history before submitting
    if (amount && note) {
      addToQuickSpendHistory({
        templateId: 'custom',
        amount: Number(amount),
        note
      });
    }
    
    mutation.mutate({ amount: Number(amount), note, account_id: accountId });
  };

  const handleUseHistory = (item: QuickSpendHistoryItem) => {
    setNote(item.note);
    setAmount(String(item.amount));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-xs uppercase tracking-wide text-[--text-muted]">Quick templates</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {templates.filter(t => t.favorite).map((template) => (
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
        {templates.filter(t => t.favorite).length > 0 && (
          <div className="mt-3 text-xs text-[--text-muted]">Favorites shown above</div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-wide text-[--text-muted]">All templates</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {templates.filter(t => !t.favorite).map((template) => (
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

      <QuickSpendHistory onUseHistory={handleUseHistory} />

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
          <>
            into{' '}
            <span className="font-medium text-[--text-primary]">
              {accounts.find((account) => account.id === accountId)?.name ?? 'your default account'}
            </span>
            .
          </>
        ) : (
          <>
            after you set a default account in <span className="font-medium text-[--text-primary]">Manage</span>.
          </>
        )}
      </div>

      {mutation.error ? (
        <div className="text-sm text-[--danger]">
          {mutation.error instanceof Error ? mutation.error.message : 'Could not add transaction.'}
        </div>
      ) : null}
      {status ? <div className="text-sm text-[--text-secondary]">{status}</div> : null}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-[--radius] bg-[--accent] px-4 py-3 font-semibold text-[--bg-primary]"
      >
        {mutation.isPending ? 'Saving...' : 'Done'}
      </button>
    </form>
  );
}
