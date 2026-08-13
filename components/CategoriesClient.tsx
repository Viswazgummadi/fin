"use client";

import { useState } from 'react';
import type { Category } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const supabase = createSupabaseBrowserClient();
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Category['kind']>('expense');

  const addCategory = async () => {
    if (!supabase || !name.trim()) return;
    const { data, error } = await supabase.from('categories').insert({ name, kind }).select('*').single();
    if (!error && data) setCategories([data, ...categories]);
    setName('');
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <input className="rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={kind} onChange={(e) => setKind(e.target.value as Category['kind'])}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="both">Both</option>
        </select>
        <button onClick={addCategory} className="rounded-lg bg-accent px-4 py-2 font-medium text-black">Add category</button>
      </div>
      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-bg-secondary p-4">
            <div className="font-medium">{c.name}</div>
            <div className="text-sm text-text-secondary">{c.kind}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
