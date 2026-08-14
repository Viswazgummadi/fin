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
    <div className="space-y-4 fade-up">
      <section className="surface-card p-4">
        <div className="mb-3">
          <div className="kicker">Classification</div>
          <div className="mt-1 font-medium">Create or edit category</div>
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
        {categories.map((c) => (
          <div key={c.id} className="surface-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="mt-1 text-sm text-[--text-secondary]">{c.kind}{c.is_essential === null ? '' : c.is_essential ? ' · essential' : ' · optional'}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => edit(c)} className="btn-secondary text-sm">Edit</button>
                <button onClick={() => archive(c.id)} className="btn-ghost text-sm">Archive</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
