"use client";

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Star, Trash2, Plus } from 'lucide-react';
import type { Account } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import {
  readQuickSpendConfig,
  type QuickSpendConfig,
  normalizeQuickSpendConfig,
  saveQuickSpendConfig as saveLocal,
} from '../lib/quick-spend';
import { queryKeys } from '../lib/query-keys';
import { enqueueOfflineOutboxItem, fetchRemoteQuickSpendConfig } from '../lib/offline-sync';

function createTemplate() {
  return {
    id: crypto.randomUUID(),
    label: '',
    note: '',
    amount: 0,
  };
}

export function QuickSpendSettings({ accounts }: { accounts: Account[] }) {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');

  const { data: remoteConfig, isLoading } = useQuery({
    queryKey: queryKeys.quickSpendConfig,
    queryFn: async () => {
      if (!supabase) return null;
      return fetchRemoteQuickSpendConfig(supabase);
    },
    enabled: !!supabase,
  });

  const [config, setConfig] = useState<QuickSpendConfig>(() => normalizeQuickSpendConfig(readQuickSpendConfig(), accounts[0]?.id));

  useEffect(() => {
    const localConfig = normalizeQuickSpendConfig(readQuickSpendConfig(), accounts[0]?.id);
    setConfig(remoteConfig ? normalizeQuickSpendConfig(remoteConfig, accounts[0]?.id) : localConfig);

    if (remoteConfig) {
      saveLocal(normalizeQuickSpendConfig(remoteConfig, accounts[0]?.id));
    }
  }, [remoteConfig, accounts]);

  const canSave = useMemo(
    () => config.templates.some((item) => item.label.trim() && item.note.trim() && Number(item.amount) > 0),
    [config.templates]
  );

  const updateTemplate = (id: string, field: 'label' | 'note' | 'amount' | 'favorite', value: string | boolean) => {
    setConfig((current) => ({
      ...current,
      templates: current.templates.map((template) =>
        template.id === id
          ? {
              ...template,
              [field]: field === 'amount' ? Number(value || 0) : value,
            }
          : template
      ),
    }));
  };

  const removeTemplate = (id: string) => {
    setConfig((current) => ({
      ...current,
      templates: current.templates.filter((template) => template.id !== id),
    }));
  };

  const mutation = useMutation({
    mutationFn: async (newConfig: QuickSpendConfig) => {
      const sanitized = normalizeQuickSpendConfig(newConfig, accounts[0]?.id);

      // Always save locally immediately
      saveLocal(sanitized);

      if (!navigator.onLine || !supabase) {
        enqueueOfflineOutboxItem({
          id: crypto.randomUUID(),
          kind: 'quick-spend-config',
          payload: sanitized,
          createdAt: new Date().toISOString(),
        });
        return { offline: true };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('user_preferences').upsert(
        {
          user_id: user.id,
          quick_spend_config: sanitized,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        enqueueOfflineOutboxItem({
          id: crypto.randomUUID(),
          kind: 'quick-spend-config',
          payload: sanitized,
          createdAt: new Date().toISOString(),
        });
        return { offline: true };
      }
      return { success: true };
    },
    onSuccess: (data, variables) => {
      const synced = normalizeQuickSpendConfig(variables, accounts[0]?.id);
      queryClient.setQueryData(queryKeys.quickSpendConfig, synced);
      queryClient.invalidateQueries({ queryKey: queryKeys.quickSpendConfig });
      setStatus(data.offline ? 'Settings saved locally (will sync when online).' : 'Settings synced to cloud.');
    },
    onError: (error) => {
      setStatus(error instanceof Error ? error.message : 'Could not save settings.');
    }
  });

  const save = () => {
    mutation.mutate(config);
  };

  const reset = () => {
    const next = normalizeQuickSpendConfig(null, accounts[0]?.id);
    setConfig(next);
    mutation.mutate(next);
  };

  if (isLoading) return <div className="surface-card p-4 text-sm text-[--text-secondary]">Loading…</div>;

  return (
    <section className="surface-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-semibold">Quick spend</h2>
          <p className="text-sm text-[--text-secondary]">Configure the fast-capture buttons shown in Quick Add.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="btn-secondary text-sm">
            Reset
          </button>
          <button onClick={save} disabled={!accounts.length || !canSave || mutation.isPending} className="btn-primary text-sm disabled:opacity-60">
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          <label className="kicker">Default account</label>
          <select
            value={config.defaultAccountId}
            onChange={(e) => setConfig((current) => ({ ...current, defaultAccountId: e.target.value }))}
            className="field"
          >
            {accounts.length ? accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>) : <option value="">Create an account first</option>}
          </select>
          <p className="text-xs text-[--text-muted]">Used by Quick Add unless a button overrides it.</p>
        </div>

        <div className="space-y-2.5">
          {config.templates.map((template) => (
            <div key={template.id} className="data-row grid items-center gap-2 p-2.5 sm:grid-cols-[1fr_1fr_9rem_auto]">
              <input
                value={template.label}
                onChange={(e) => updateTemplate(template.id, 'label', e.target.value)}
                placeholder="Button label"
                className="field"
              />
              <input
                value={template.note}
                onChange={(e) => updateTemplate(template.id, 'note', e.target.value)}
                placeholder="Saved note"
                className="field"
              />
              <input
                value={template.amount || ''}
                onChange={(e) => updateTemplate(template.id, 'amount', e.target.value)}
                placeholder="Amount"
                inputMode="decimal"
                className="field text-right font-mono"
              />
              <div className="flex shrink-0 items-center justify-end gap-1.5">
                <button
                  onClick={() => updateTemplate(template.id, 'favorite', !template.favorite)}
                  aria-label={template.favorite ? 'Remove from favorites' : 'Mark as favorite'}
                  aria-pressed={template.favorite}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[--radius-xs] border transition-colors ${
                    template.favorite
                      ? 'border-[--warning] bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[--warning]'
                      : 'border-[--hairline-strong] text-[--text-secondary] hover:text-[--text-primary]'
                  }`}
                >
                  <Star size={16} fill={template.favorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => removeTemplate(template.id)}
                  aria-label="Remove quick spend button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[--radius-xs] border border-[--hairline-strong] text-[--text-secondary] transition-colors hover:border-[--danger] hover:text-[--danger]"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setConfig((current) => ({ ...current, templates: [...current.templates, createTemplate()] }))}
            className="flex w-full items-center justify-center gap-1.5 rounded-[--radius-sm] border border-dashed border-[--hairline-strong] px-3 py-3 text-sm text-[--text-secondary] transition-colors hover:text-[--text-primary]"
          >
            <Plus size={15} />
            Add quick spend button
          </button>
        </div>
      </div>

      {status ? <div className="mt-3 text-sm text-[--text-secondary]">{status}</div> : null}
    </section>
  );
}
