"use client";

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Account, Category, Transaction } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

type Snapshot = {
  accounts?: Account[];
  categories?: Category[];
  tags?: { id: string; user_id: string; name: string; color: string | null }[];
  transactions?: Transaction[];
};

export function BackupRestoreClient() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState<Snapshot | null>(null);

  const summary = useMemo(() => ({
    accounts: loaded?.accounts?.length ?? 0,
    categories: loaded?.categories?.length ?? 0,
    transactions: loaded?.transactions?.length ?? 0,
  }), [loaded]);

  const download = async () => {
    if (!supabase) {
      setStatus('Supabase is not configured.');
      return;
    }

    setLoading(true);
    setStatus('Preparing backup...');

    const [{ data: accounts, error: accountsError }, { data: categories, error: categoriesError }, { data: tags, error: tagsError }, { data: transactions, error: transactionsError }] = await Promise.all([
      supabase.from('accounts').select('*').eq('archived', false),
      supabase.from('categories').select('*').eq('archived', false),
      supabase.from('tags').select('*').order('name', { ascending: true }),
      supabase.from('transactions').select('*').order('occurred_at', { ascending: false }),
    ]);

    const firstError = accountsError || categoriesError || tagsError || transactionsError;
    if (firstError) {
      setLoading(false);
      setStatus(firstError.message);
      return;
    }

    const snapshot: Snapshot = {
      accounts: accounts ?? [],
      categories: categories ?? [],
      tags: tags ?? [],
      transactions: transactions ?? [],
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
    setStatus('Backup downloaded.');
  };

  const loadFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text) as Snapshot;
      if (!Array.isArray(json.accounts) || !Array.isArray(json.categories) || !Array.isArray(json.transactions)) {
        throw new Error('Invalid backup format.');
      }
      setLoaded(json);
      setStatus('Backup file loaded and ready to restore.');
    } catch (error) {
      setLoaded(null);
      setStatus(error instanceof Error ? error.message : 'Could not read backup file.');
    }
  };

  const restore = async () => {
    if (!supabase || !loaded) {
      setStatus('Load a valid backup first.');
      return;
    }

    const ok = window.confirm('This will replace your current accounts, categories, and transactions with the loaded backup. Continue?');
    if (!ok) return;

    setLoading(true);
    setStatus('Preparing restore...');

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;
    if (userError || !user) {
      setLoading(false);
      setStatus('Please sign in first.');
      return;
    }

    const deletionOrder = ['transactions', 'tags', 'categories', 'accounts'] as const;

    for (const table of deletionOrder) {
      const { error } = await supabase.from(table).delete().eq('user_id', user.id);
      if (error) {
        setLoading(false);
        setStatus(`Could not clear ${table}: ${error.message}`);
        return;
      }
    }

    const accounts = (loaded.accounts ?? []).map((row) => ({ ...row, user_id: user.id }));
    const categories = (loaded.categories ?? []).map((row) => ({ ...row, user_id: user.id }));
    const tags = (loaded.tags ?? []).map((row) => ({ ...row, user_id: user.id }));
    const transactions = (loaded.transactions ?? []).map((row) => ({
      ...row,
      user_id: user.id,
      deleted_at: row.deleted_at ?? null,
      transfer_account_id: row.transfer_account_id ?? null,
      category_id: row.category_id ?? null,
      is_planned: row.is_planned ?? true,
    }));

    if (accounts.length) {
      const { error } = await supabase.from('accounts').insert(accounts);
      if (error) {
        setLoading(false);
        setStatus(`Could not restore accounts: ${error.message}`);
        return;
      }
    }

    if (tags.length) {
      const { error } = await supabase.from('tags').insert(tags);
      if (error) {
        setLoading(false);
        setStatus(`Could not restore tags: ${error.message}`);
        return;
      }
    }

    if (categories.length) {
      const { error } = await supabase.from('categories').insert(categories);
      if (error) {
        setLoading(false);
        setStatus(`Could not restore categories: ${error.message}`);
        return;
      }
    }

    if (transactions.length) {
      const { error } = await supabase.from('transactions').insert(transactions);
      if (error) {
        setLoading(false);
        setStatus(`Could not restore transactions: ${error.message}`);
        return;
      }
    }

    setLoading(false);
    setStatus('Restore complete.');
    router.refresh();
  };

  return (
    <div className="surface-card space-y-5 p-5 fade-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="kicker">Safety</div>
          <div className="mt-2 text-lg font-semibold">Backup / Restore</div>
          <p className="mt-1 max-w-2xl text-sm text-[--text-secondary]">Export your latest data as JSON any time, or restore from a previous backup with a deliberate confirmation step.</p>
        </div>
        <div className="grid min-w-[220px] gap-2 text-sm text-[--text-secondary] sm:grid-cols-3 lg:grid-cols-1">
          <div className="surface-soft px-3 py-2">JSON backup</div>
          <div className="surface-soft px-3 py-2">Manual restore</div>
          <div className="surface-soft px-3 py-2">User-scoped only</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={download} disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? 'Preparing...' : 'Download JSON backup'}
        </button>
        <button onClick={() => fileRef.current?.click()} className="btn-secondary">
          Choose backup file
        </button>
      </div>

      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => loadFile(e.target.files?.[0] ?? null)} />

      {loaded ? (
        <div className="surface-soft p-4 text-sm text-[--text-secondary]">
          <div className="font-medium text-[--text-primary]">Loaded backup ready</div>
          <div className="mt-1">{summary.accounts} accounts, {summary.categories} categories, {summary.transactions} transactions.</div>
          <div className="mt-3">
            <button disabled={loading} onClick={restore} className="btn-secondary text-sm text-[--text-primary]">
              {loading ? 'Restoring...' : 'Restore this backup'}
            </button>
          </div>
        </div>
      ) : null}

      {status ? <div className="text-sm text-[--text-secondary]">{status}</div> : null}
    </div>
  );
}
