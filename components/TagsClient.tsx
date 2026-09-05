"use client";

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Tag } from '../lib/types';
import { queryKeys } from '../lib/query-keys';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

const PRESET_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
];

export function TagsClient({ initialTags }: { initialTags: Tag[] }) {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();
  const [tags, setTags] = useState(initialTags);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  const add = async () => {
    if (!supabase || !name.trim()) return;
    const { data, error } = await supabase.from('tags').insert({ name, color }).select('*').single();
    if (!error && data) {
      setTags([data, ...tags]);
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    }
    setName('');
  };

  const remove = async (id: string) => {
    if (!supabase) return;
    if (!window.confirm('Delete this tag? It will be removed from any transactions it is applied to.')) return;
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (!error) {
      setTags(tags.filter((t) => t.id !== id));
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactionWindows });
      queryClient.invalidateQueries({ queryKey: queryKeys.analysisTransactions });
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <section className="surface-card space-y-3 p-4">
        <div>
          <div className="kicker">Organize</div>
          <div className="mt-1 font-medium">Create tag</div>
        </div>
        <input className="field" placeholder="Tag name" value={name} onChange={(e) => setName(e.target.value)} />
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {PRESET_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => setColor(swatch)}
                aria-label={`Use color ${swatch}`}
                className="h-7 w-7 rounded-full transition"
                style={{
                  background: swatch,
                  boxShadow: color === swatch ? '0 0 0 2px var(--bg-secondary), 0 0 0 4px var(--accent)' : 'none',
                }}
              />
            ))}
          </div>
          <input className="field font-mono text-sm" placeholder="#hexcolor" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        <button onClick={add} className="btn-primary w-full">Add tag</button>
      </section>

      <section className="surface-card p-4">
        <div className="mb-3">
          <div className="kicker">Labels</div>
          <div className="mt-1 font-medium">Saved tags</div>
        </div>
        {tags.length ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="data-row inline-flex items-center gap-2 px-3 py-2 text-sm"
                style={{ borderColor: `${tag.color ?? '#6366f1'}40` }}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tag.color ?? '#6366f1' }} />
                {tag.name}
                <button
                  type="button"
                  onClick={() => remove(tag.id)}
                  aria-label={`Delete tag ${tag.name}`}
                  className="ml-1 text-[--text-muted] transition hover:text-[--danger]"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <EmptyState text="No tags yet. Create one to start organizing transactions." />
        )}
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[--radius-sm] border border-dashed border-[--hairline] p-6 text-center text-sm text-[--text-muted]">{text}</div>;
}
