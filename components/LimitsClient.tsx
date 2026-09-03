"use client";

import { useEffect, useMemo, useState } from 'react';
import type { Category, Limit, Tag } from '../lib/types';
import type { TransactionWithTags } from '../lib/analysis';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { formatMoney } from '../lib/insights';
import { RadialProgress } from './charts/RadialProgress';

function periodStart(period: Limit['period'], reference = new Date()) {
  const start = new Date(reference);
  if (period === 'weekly') {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
  } else {
    start.setDate(1);
  }
  start.setHours(0, 0, 0, 0);
  return start;
}

function spentForLimit(limit: Limit, transactions: TransactionWithTags[]) {
  const start = periodStart(limit.period);
  return transactions.reduce((sum, txn) => {
    if (txn.deleted_at || txn.type !== 'expense') return sum;
    if (new Date(txn.occurred_at) < start) return sum;
    if (limit.scope === 'category' && txn.category_id !== limit.scope_ref_id) return sum;
    if (limit.scope === 'tag' && !txn.tags.some((tag) => tag.id === limit.scope_ref_id)) return sum;
    return sum + Number(txn.amount || 0);
  }, 0);
}

export function LimitsClient({
  initialLimits,
  categories,
  tags,
  transactions,
}: {
  initialLimits: Limit[];
  categories: Category[];
  tags: Tag[];
  transactions: TransactionWithTags[];
}) {
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

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const tagMap = useMemo(() => new Map(tags.map((t) => [t.id, t.name])), [tags]);

  const limitLabel = (limit: Limit) => {
    if (limit.scope === 'overall') return 'Overall';
    if (limit.scope === 'category') return categoryMap.get(limit.scope_ref_id ?? '') ?? 'Category';
    return tagMap.get(limit.scope_ref_id ?? '') ?? 'Tag';
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <section className="surface-card space-y-4 p-4">
        <div>
          <div className="kicker">Budgets</div>
          <div className="mt-1 font-medium">{editingId ? 'Edit limit' : 'Add limit'}</div>
        </div>
        <div className="grid gap-3">
          <select className="field" value={scope} onChange={(e) => setScope(e.target.value as Limit['scope'])}>
            <option value="category">Category</option>
            <option value="tag">Tag</option>
            <option value="overall">Overall</option>
          </select>
          {scope !== 'overall' ? (
            <select className="field" value={scopeRefId} onChange={(e) => setScopeRefId(e.target.value)}>
              <option value="">Choose {currentLabel}</option>
              {currentTargets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          ) : null}
          <select className="field" value={period} onChange={(e) => setPeriod(e.target.value as Limit['period'])}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input className="field" placeholder="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button onClick={save} className="btn-primary">{editingId ? 'Update' : 'Add'} limit</button>
          {editingId ? <button onClick={reset} className="btn-ghost text-sm">Cancel edit</button> : null}
        </div>
      </section>

      <section className="surface-card p-4">
        <div className="mb-3">
          <div className="kicker">Tracking</div>
          <div className="mt-1 font-medium">Active limits</div>
        </div>
        {limits.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {limits.map((limit) => {
              const spent = spentForLimit(limit, transactions);
              const target = Number(limit.amount) || 0;
              const ratio = target > 0 ? spent / target : 0;
              return (
                <div key={limit.id} className="data-row flex items-center gap-3 p-3">
                  <RadialProgress value={ratio} size={64} thickness={7} label={`${Math.round(ratio * 100)}%`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{limitLabel(limit)}</div>
                    <div className="text-xs capitalize text-[--text-secondary]">{limit.period}</div>
                    <div className="font-mono text-sm">{formatMoney(spent)} / {formatMoney(target)}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button onClick={() => edit(limit)} className="btn-ghost px-2 py-1 text-xs">Edit</button>
                    <button onClick={() => disable(limit.id)} className="btn-ghost px-2 py-1 text-xs">Disable</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState text="No limits yet. Set a spending cap by category, tag, or overall." />
        )}
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[--radius-sm] border border-dashed border-[--hairline] p-6 text-center text-sm text-[--text-muted]">{text}</div>;
}
