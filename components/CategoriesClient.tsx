"use client";

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Category } from '../lib/types';
import { queryKeys } from '../lib/query-keys';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

const KIND_COLOR: Record<Category['kind'], string> = {
  expense: 'var(--danger)',
  income: 'var(--accent)',
  both: 'var(--accent-2)',
};

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Category['kind']>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEssential, setIsEssential] = useState<'unknown' | 'essential' | 'optional'>('unknown');

  const reset = () => {
    setEditingId(null);
    setName('');
    setKind('expense');
    setIsEssential('unknown');
  };

  const addOrUpdate = async () => {
    if (!supabase || !name.trim()) return;
    const essentialValue = isEssential === 'unknown' ? null : isEssential === 'essential';
    if (editingId) {
      const { data, error } = await supabase.from('categories').update({ name, kind, is_essential: essentialValue }).eq('id', editingId).select('*').single();
      if (!error && data) {
        setCategories(categories.map((c) => (c.id === editingId ? data : c)));
        queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      }
      reset();
      return;
    }
    const { data, error } = await supabase.from('categories').insert({ name, kind, is_essential: essentialValue }).select('*').single();
    if (!error && data) {
      setCategories([data, ...categories]);
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    }
    reset();
  };

  const edit = (c: Category) => {
    setEditingId(c.id);
    setName(c.name);
    setKind(c.kind);
    setIsEssential(c.is_essential === null ? 'unknown' : c.is_essential ? 'essential' : 'optional');
  };

  const archive = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('categories').update({ archived: true }).eq('id', id);
    if (!error) {
      setCategories(categories.filter((c) => c.id !== id));
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    }
  };

  return (
    <div className="space-y-4">
      <section className="surface-card p-4">
        <div className="mb-3">
          <div className="kicker">Classification</div>
          <div className="mt-1 font-medium">{editingId ? 'Edit category' : 'Create category'}</div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <input className="field" placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="field" value={kind} onChange={(e) => setKind(e.target.value as Category['kind'])}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="both">Both</option>
          </select>
          <select className="field" value={isEssential} onChange={(e) => setIsEssential(e.target.value as 'unknown' | 'essential' | 'optional')}>
            <option value="unknown">Essential?</option>
            <option value="essential">Essential</option>
            <option value="optional">Optional</option>
          </select>
          <button onClick={addOrUpdate} className="btn-primary">{editingId ? 'Update' : 'Add'} category</button>
        </div>
        {editingId ? <button onClick={reset} className="btn-ghost mt-2 text-sm">Cancel edit</button> : null}
      </section>

      <div className="grid gap-3">
        {categories.length ? categories.map((c) => (
          <div key={c.id} className="data-row flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[c.kind] }} />
              <div className="min-w-0">
                <div className="font-medium">{c.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm capitalize text-[--text-secondary]">
                  {c.kind}
                  {c.is_essential !== null ? (
                    <span className="surface-soft px-2 py-0.5 text-xs capitalize text-[--text-secondary]">
                      {c.is_essential ? 'Essential' : 'Optional'}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => edit(c)} className="btn-secondary text-sm">Edit</button>
              <button onClick={() => archive(c.id)} className="btn-ghost text-sm">Archive</button>
            </div>
          </div>
        )) : <EmptyState text="No categories yet. Add your first category above." />}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[--radius-sm] border border-dashed border-[--hairline] p-6 text-center text-sm text-[--text-muted]">{text}</div>;
}
