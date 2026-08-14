"use client";

import { useEffect, useMemo, useState } from 'react';
import type { Category, Limit, Tag } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { formatMoney } from '../lib/insights';

export function LimitsClient({ initialLimits, categories, tags }: { initialLimits: Limit[]; categories: Category[]; tags: Tag[] }) {
  const supabase = createSupabaseBrowserClient();
  const [limits, setLimits] = useState(initialLimits);
  const [scope, setScope] = useState<Limit['scope']>('category');
  const [scopeRefId, setScopeRefId] = useState(categories[0]?.id ?? tags[0]?.id ?? '');
  const [period, setPeriod] = useState<Limit['period']>('monthly');
  const [amount, setAmount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const reset = () => {
    setEditingId(null);
    setScope('category');
    setScopeRefId(categories[0]?.id ?? tags[0]?.id ?? '');
    setPeriod('monthly');
    setAmount('');
  };

  const save = async () => {
    if (!supabase || !amount) return;
    const payload = { scope, scope_ref_id: scope === 'overall' ? null : scopeRefId || null, period, amount, active: true };
    if (editingId) {
      const { data, error } = await supabase.from('limits').update(payload).eq('id', editingId).select('*').single();
      if (!error && data) setLimits(limits.map((item) => (item.id === editingId ? data : item)));
      reset();
      return;
    }
    const { data, error } = await supabase.from('limits').insert(payload).select('*').single();
    if (!error && data) setLimits([data, ...limits]);
    reset();
  };

  const edit = (limit: Limit) => {
    setEditingId(limit.id);
    setScope(limit.scope);
    setScopeRefId(limit.scope_ref_id ?? categories[0]?.id ?? tags[0]?.id ?? '');
    setPeriod(limit.period);
    setAmount(limit.amount);
  };

  const disable = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('limits').update({ active: false }).eq('id', id);
    if (!error) setLimits(limits.filter((item) => item.id !== id));
  };

  useEffect(() => {
    if (scope === 'tag') setScopeRefId(tags[0]?.id ?? '');
    if (scope === 'category') setScopeRefId(categories[0]?.id ?? '');
    if (scope === 'overall') setScopeRefId('');
  }, [scope, categories, tags]);

  const currentTargets = useMemo(() => {
    if (scope === 'tag') return tags;
    if (scope === 'category') return categories;
    return [];
  }, [scope, categories, tags]);

  const currentLabel = scope === 'tag' ? 'tag' : 'category';

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <section className="space-y-4 rounded-xl border border-border bg-bg-secondary p-4">
        <div className="font-semibold">Limits</div>
        <div className="grid gap-3">
          <select className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={scope} onChange={(e) => setScope(e.target.value as Limit['scope'])}>
            <option value="category">Category</option>
            <option value="tag">Tag</option>
            <option value="overall">Overall</option>
          </select>
          {scope !== 'overall' ? (
            <select className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={scopeRefId} onChange={(e) => setScopeRefId(e.target.value)}>
              <option value="">Choose {currentLabel}</option>
              {currentTargets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          ) : null}
          <select className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={period} onChange={(e) => setPeriod(e.target.value as Limit['period'])}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button onClick={save} className="min-h-11 rounded-lg bg-accent px-4 py-2 font-medium text-black">{editingId ? 'Update' : 'Add'} limit</button>
          {editingId ? <button onClick={reset} className="text-sm text-text-secondary">Cancel edit</button> : null}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-bg-secondary p-4">
        <div className="font-semibold">Active limits</div>
        {limits.length ? limits.map((limit) => (
          <div key={limit.id} className="rounded-xl border border-border bg-bg-primary/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{limit.scope}{limit.scope_ref_id ? ' · target set' : ''}</div>
                <div className="text-sm text-text-secondary">{limit.period}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => edit(limit)} className="rounded-lg border border-border px-3 py-1 text-sm">Edit</button>
                <button onClick={() => disable(limit.id)} className="rounded-lg border border-border px-3 py-1 text-sm">Disable</button>
              </div>
            </div>
            <div className="mt-2 font-mono">{formatMoney(Number(limit.amount))}</div>
          </div>
        )) : <div className="rounded-lg border border-dashed border-border p-4 text-sm text-text-secondary">No limits yet.</div>}
      </section>
    </div>
  );
}
