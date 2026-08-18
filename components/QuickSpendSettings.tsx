"use client";

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { Account } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import {
  DEFAULT_QUICK_SPEND_TEMPLATES,
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

  if (isLoading) return <div className="p-4 text-sm text-[--text-secondary]">Loading...</div>;

  return (
    <section className="rounded-xl border border-[--border] bg-[--bg-secondary] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Quick spend</h2>
          <p className="text-sm text-[--text-secondary]">Configure quick buttons.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="rounded-[--radius] border border-[--border] px-3 py-2 text-sm">Reset</button>
          <button onClick={save} disabled={!accounts.length || !canSave || mutation.isPending} className="rounded-[--radius] bg-[--accent] px-3 py-2 text-sm font-semibold text-[--bg-primary] disabled:opacity-60">
            {mutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wide text-[--text-muted]">Default account</label>
          <select
            value={config.defaultAccountId}
            onChange={(e) => setConfig((current) => ({ ...current, defaultAccountId: e.target.value }))}
            className="w-full rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-3 py-3"
          >
            {accounts.length ? accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>) : <option value="">Create an account first</option>}
          </select>
          <p className="text-xs text-[--text-muted]">Default account for quick spend.</p>
        </div>

        <div className="space-y-3">
          {config.templates.map((template) => (
            <div key={template.id} className="grid gap-3 rounded-[--radius] border border-[--border] bg-[--bg-primary]/40 p-3 md:grid-cols-[140px_1fr_120px_90px]">
              <input
                value={template.label}
                onChange={(e) => updateTemplate(template.id, 'label', e.target.value)}
                placeholder="Button label"
                className="rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-3 py-2"
              />
              <input
                value={template.note}
                onChange={(e) => updateTemplate(template.id, 'note', e.target.value)}
                placeholder="Saved note"
                className="rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-3 py-2"
              />
              <input
                value={template.amount || ''}
                onChange={(e) => updateTemplate(template.id, 'amount', e.target.value)}
                placeholder="Amount"
                inputMode="decimal"
                className="rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-3 py-2 text-right font-mono"
              />
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => updateTemplate(template.id, 'favorite', !template.favorite)}
                  className={`rounded-[--radius] px-3 py-2 text-sm ${
                    template.favorite 
                      ? 'bg-yellow-500/10 text-yellow-500' 
                      : 'border border-[--border] text-[--text-secondary]'
                  }`}
                >
                  {template.favorite ? '★ Favorite' : '☆ Favorite'}
                </button>
                <button onClick={() => removeTemplate(template.id)} className="rounded-[--radius] border border-[--border] px-3 py-2 text-sm text-[--text-secondary]">Remove</button>
              </div>
            </div>
          ))}

          <button onClick={() => setConfig((current) => ({ ...current, templates: [...current.templates, createTemplate()] }))} className="rounded-[--radius] border border-dashed border-[--border] px-3 py-3 text-sm text-[--text-secondary]">
            + Add quick spend button
          </button>
        </div>
      </div>

      {status ? <div className="mt-3 text-sm text-[--text-secondary]">{status}</div> : null}
    </section>
  );
}
