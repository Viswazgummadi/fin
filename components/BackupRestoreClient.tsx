"use client";

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Account, Category, Transaction } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

type Snapshot = {
  accounts?: Account[];
  categories?: Category[];
  transactions?: Transaction[];
};

export function BackupRestoreClient({ snapshot }: { snapshot: { accounts: Account[]; categories: Category[]; transactions: Transaction[] } }) {
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

  const download = () => {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

    const deletionOrder = ['transactions', 'categories', 'accounts'] as const;

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
    <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-4">
      <div>
        <div className="font-medium">Backup / Restore</div>
        <p className="mt-1 text-sm text-text-secondary">Export your current data as JSON or restore a previously exported backup file.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={download} className="rounded-lg bg-accent px-4 py-2 font-medium text-black">
          Download JSON backup
        </button>
        <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-border px-4 py-2 font-medium">
          Choose backup file
        </button>
      </div>

      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => loadFile(e.target.files?.[0] ?? null)} />

      {loaded ? (
        <div className="rounded-lg border border-border bg-bg-primary/50 p-3 text-sm text-text-secondary">
          Loaded backup: {summary.accounts} accounts, {summary.categories} categories, {summary.transactions} transactions.
          <div className="mt-2">
            <button disabled={loading} onClick={restore} className="rounded-lg border border-border px-4 py-2 text-sm text-text-primary">
              {loading ? 'Restoring...' : 'Restore this backup'}
            </button>
          </div>
        </div>
      ) : null}

      {status ? <div className="text-sm text-text-secondary">{status}</div> : null}
    </div>
  );
}
