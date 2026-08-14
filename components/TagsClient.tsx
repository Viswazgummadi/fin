"use client";

import { useState } from 'react';
import type { Tag } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

export function TagsClient({ initialTags }: { initialTags: Tag[] }) {
  const supabase = createSupabaseBrowserClient();
  const [tags, setTags] = useState(initialTags);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  const add = async () => {
    if (!supabase || !name.trim()) return;
    const { data, error } = await supabase.from('tags').insert({ name, color }).select('*').single();
    if (!error && data) setTags([data, ...tags]);
    setName('');
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="space-y-3 rounded-xl border border-border bg-bg-secondary p-4">
        <div className="font-semibold">Tags</div>
        <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Tag name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="# color" value={color} onChange={(e) => setColor(e.target.value)} />
        <button onClick={add} className="min-h-11 rounded-lg bg-accent px-4 py-2 font-medium text-black">Add tag</button>
      </section>
      <section className="space-y-3 rounded-xl border border-border bg-bg-secondary p-4">
        <div className="font-semibold">Saved tags</div>
        <div className="flex flex-wrap gap-2">
          {tags.length ? tags.map((tag) => (
            <span key={tag.id} className="rounded-full border border-border px-3 py-2 text-sm" style={{ backgroundColor: `${tag.color ?? '#6366f1'}22` }}>
              {tag.name}
            </span>
          )) : <div className="text-sm text-text-secondary">No tags yet.</div>}
        </div>
      </section>
    </div>
  );
}
