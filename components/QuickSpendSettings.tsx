"use client";

import { useEffect, useMemo, useState } from 'react';
import type { Account } from '../lib/types';
import {
  DEFAULT_QUICK_SPEND_TEMPLATES,
  type QuickSpendConfig,
  readQuickSpendConfig,
  saveQuickSpendConfig,
} from '../lib/quick-spend';

function createTemplate() {
  return {
    id: crypto.randomUUID(),
    label: '',
    note: '',
    amount: 0,
  };
}

export function QuickSpendSettings({ accounts }: { accounts: Account[] }) {
  const [config, setConfig] = useState<QuickSpendConfig>({ defaultAccountId: '', templates: DEFAULT_QUICK_SPEND_TEMPLATES });
  const [status, setStatus] = useState('');

  useEffect(() => {
    const stored = readQuickSpendConfig();
    setConfig({
      defaultAccountId: stored.defaultAccountId || accounts[0]?.id || '',
      templates: stored.templates.length ? stored.templates : DEFAULT_QUICK_SPEND_TEMPLATES,
    });
  }, [accounts]);

  const canSave = useMemo(
    () => config.templates.some((item) => item.label.trim() && item.note.trim() && Number(item.amount) > 0),
    [config.templates]
  );

  const updateTemplate = (id: string, field: 'label' | 'note' | 'amount', value: string) => {
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

  const save = () => {
    const sanitized = {
      ...config,
      defaultAccountId: config.defaultAccountId || accounts[0]?.id || '',
      templates: config.templates
        .map((item) => ({
          ...item,
          label: item.label.trim(),
          note: item.note.trim(),
          amount: Number(item.amount || 0),
        }))
        .filter((item) => item.label && item.note && item.amount > 0),
    };

    saveQuickSpendConfig({
      defaultAccountId: sanitized.defaultAccountId,
      templates: sanitized.templates.length ? sanitized.templates : DEFAULT_QUICK_SPEND_TEMPLATES,
    });
    setConfig({
      defaultAccountId: sanitized.defaultAccountId,
      templates: sanitized.templates.length ? sanitized.templates : DEFAULT_QUICK_SPEND_TEMPLATES,
    });
    setStatus('Quick spend buttons saved.');
  };

  const reset = () => {
    const next = {
      defaultAccountId: accounts[0]?.id || '',
      templates: DEFAULT_QUICK_SPEND_TEMPLATES,
    };
    setConfig(next);
    saveQuickSpendConfig(next);
    setStatus('Reset to defaults.');
  };

  return (
    <section className="rounded-xl border border-[--border] bg-[--bg-secondary] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Quick spend buttons</h2>
          <p className="text-sm text-[--text-secondary]">Configure the small-spend popup. Set one default account and define your ready-made buttons.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="rounded-[--radius] border border-[--border] px-3 py-2 text-sm">Reset</button>
          <button onClick={save} disabled={!accounts.length || !canSave} className="rounded-[--radius] bg-[--accent] px-3 py-2 text-sm font-semibold text-[--bg-primary] disabled:opacity-60">Save</button>
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
          <p className="text-xs text-[--text-muted]">Quick add will always save into this account.</p>
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
              <button onClick={() => removeTemplate(template.id)} className="rounded-[--radius] border border-[--border] px-3 py-2 text-sm text-[--text-secondary]">Remove</button>
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
