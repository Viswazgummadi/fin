"use client";

import { useState } from 'react';
import type { Category } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const supabase = createSupabaseBrowserClient();
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
      if (!error && data) setCategories(categories.map((c) => (c.id === editingId ? data : c)));
      reset();
      return;
    }
    const { data, error } = await supabase.from('categories').insert({ name, kind, is_essential: essentialValue }).select('*').single();
    if (!error && data) setCategories([data, ...categories]);
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
    if (!error) setCategories(categories.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <input className="rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={kind} onChange={(e) => setKind(e.target.value as Category['kind'])}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="both">Both</option>
        </select>
        <select className="rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={isEssential} onChange={(e) => setIsEssential(e.target.value as 'unknown' | 'essential' | 'optional')}>
          <option value="unknown">Essential?</option>
          <option value="essential">Essential</option>
          <option value="optional">Optional</option>
        </select>
        <button onClick={addOrUpdate} className="rounded-lg bg-accent px-4 py-2 font-medium text-black">{editingId ? 'Update' : 'Add'} category</button>
      </div>
      {editingId ? <button onClick={reset} className="text-sm text-text-secondary">Cancel edit</button> : null}
      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-bg-secondary p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-text-secondary">{c.kind}{c.is_essential === null ? '' : c.is_essential ? ' · essential' : ' · optional'}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => edit(c)} className="rounded-lg border border-border px-3 py-1 text-sm">Edit</button>
                <button onClick={() => archive(c.id)} className="rounded-lg border border-border px-3 py-1 text-sm">Archive</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
