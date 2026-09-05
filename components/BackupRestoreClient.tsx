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

  const normalizeName = (name: string) => name.trim().toLowerCase();

  const mergeImport = async () => {
    if (!supabase || !loaded) {
      setStatus('Load a valid backup first.');
      return;
    }

    setLoading(true);
    setStatus('Importing...');

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;
    if (userError || !user) {
      setLoading(false);
      setStatus('Please sign in first.');
      return;
    }

    const [{ data: existingAccounts, error: accountsError }, { data: existingCategories, error: categoriesError }, { data: existingTags, error: tagsError }] = await Promise.all([
      supabase.from('accounts').select('id,name'),
      supabase.from('categories').select('id,name'),
      supabase.from('tags').select('id,name'),
    ]);
    if (accountsError || categoriesError || tagsError) {
      setLoading(false);
      setStatus((accountsError || categoriesError || tagsError)?.message ?? 'Could not read existing data.');
      return;
    }

    const accountIdByName = new Map(
      ((existingAccounts as { id: string; name: string }[] | null) ?? []).map((a) => [normalizeName(a.name), a.id])
    );
    const categoryIdByName = new Map(
      ((existingCategories as { id: string; name: string }[] | null) ?? []).map((c) => [normalizeName(c.name), c.id])
    );
    const tagIdByName = new Map(
      ((existingTags as { id: string; name: string }[] | null) ?? []).map((t) => [normalizeName(t.name), t.id])
    );

    let accountsAdded = 0;
    let categoriesAdded = 0;
    let tagsAdded = 0;

    // Accounts: match existing by name, otherwise create.
    for (const account of loaded.accounts ?? []) {
      const key = normalizeName(account.name);
      if (accountIdByName.has(key)) continue;
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          name: account.name,
          type: account.type,
          opening_balance: account.opening_balance,
          currency: account.currency,
          color: account.color,
          icon: account.icon,
          archived: false,
        })
        .select('id')
        .single();
      if (error || !data) {
        setLoading(false);
        setStatus(`Could not import account "${account.name}": ${error?.message ?? 'unknown error'}`);
        return;
      }
      accountIdByName.set(key, data.id);
      accountsAdded += 1;
    }

    // Categories: create missing ones first (flat), then relink parent_id by name in a second pass.
    const oldCategoryIdToName = new Map((loaded.categories ?? []).map((c) => [c.id, c.name]));
    const newlyCreatedCategoryIds: string[] = [];
    for (const category of loaded.categories ?? []) {
      const key = normalizeName(category.name);
      if (categoryIdByName.has(key)) continue;
      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: category.name,
          kind: category.kind,
          parent_id: null,
          is_essential: category.is_essential ?? null,
          color: category.color,
          icon: category.icon,
          archived: false,
          sort_order: category.sort_order ?? 0,
        })
        .select('id')
        .single();
      if (error || !data) {
        setLoading(false);
        setStatus(`Could not import category "${category.name}": ${error?.message ?? 'unknown error'}`);
        return;
      }
      categoryIdByName.set(key, data.id);
      newlyCreatedCategoryIds.push(data.id);
      categoriesAdded += 1;
    }
    for (const category of loaded.categories ?? []) {
      const newId = categoryIdByName.get(normalizeName(category.name));
      if (!newId || !newlyCreatedCategoryIds.includes(newId) || !category.parent_id) continue;
      const parentName = oldCategoryIdToName.get(category.parent_id);
      const newParentId = parentName ? categoryIdByName.get(normalizeName(parentName)) : undefined;
      if (newParentId) await supabase.from('categories').update({ parent_id: newParentId }).eq('id', newId);
    }

    // Tags: match existing by name, otherwise create.
    for (const tag of loaded.tags ?? []) {
      const key = normalizeName(tag.name);
      if (tagIdByName.has(key)) continue;
      const { data, error } = await supabase
        .from('tags')
        .insert({ user_id: user.id, name: tag.name, color: tag.color })
        .select('id')
        .single();
      if (error || !data) {
        setLoading(false);
        setStatus(`Could not import tag "${tag.name}": ${error?.message ?? 'unknown error'}`);
        return;
      }
      tagIdByName.set(key, data.id);
      tagsAdded += 1;
    }

    // Transactions: remap account/category references by name, skip anything that can't be resolved.
    const oldAccountIdToName = new Map((loaded.accounts ?? []).map((a) => [a.id, a.name]));
    let transactionsImported = 0;
    let transactionsSkipped = 0;
    const transactionsToInsert: Record<string, unknown>[] = [];

    for (const txn of loaded.transactions ?? []) {
      if (txn.deleted_at) continue;
      const accountName = oldAccountIdToName.get(txn.account_id);
      const newAccountId = accountName ? accountIdByName.get(normalizeName(accountName)) : undefined;
      if (!newAccountId) {
        transactionsSkipped += 1;
        continue;
      }
      let newTransferAccountId: string | null = null;
      if (txn.transfer_account_id) {
        const transferName = oldAccountIdToName.get(txn.transfer_account_id);
        newTransferAccountId = (transferName ? accountIdByName.get(normalizeName(transferName)) : undefined) ?? null;
        if (!newTransferAccountId) {
          transactionsSkipped += 1;
          continue;
        }
      }
      let newCategoryId: string | null = null;
      if (txn.category_id) {
        const categoryName = oldCategoryIdToName.get(txn.category_id);
        newCategoryId = (categoryName ? categoryIdByName.get(normalizeName(categoryName)) : undefined) ?? null;
      }

      transactionsToInsert.push({
        user_id: user.id,
        account_id: newAccountId,
        transfer_account_id: newTransferAccountId,
        type: txn.type,
        amount: txn.amount,
        category_id: newCategoryId,
        note: txn.note ?? null,
        occurred_at: txn.occurred_at,
        is_planned: txn.is_planned ?? true,
        deleted_at: null,
      });
    }

    const BATCH_SIZE = 500;
    for (let i = 0; i < transactionsToInsert.length; i += BATCH_SIZE) {
      const batch = transactionsToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('transactions').insert(batch);
      if (error) {
        setLoading(false);
        setStatus(`Imported ${transactionsImported} transactions, then failed: ${error.message}`);
        return;
      }
      transactionsImported += batch.length;
    }

    setLoading(false);
    setStatus(
      `Import complete — ${accountsAdded} new account${accountsAdded === 1 ? '' : 's'}, ${categoriesAdded} new categor${categoriesAdded === 1 ? 'y' : 'ies'}, ${tagsAdded} new tag${tagsAdded === 1 ? '' : 's'}, ${transactionsImported} transaction${transactionsImported === 1 ? '' : 's'} added` +
        (transactionsSkipped ? `, ${transactionsSkipped} skipped (couldn't match account).` : '.')
    );
    router.refresh();
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
          <div className="kicker">Backup</div>
          <div className="mt-2 text-lg font-semibold">Backup / Import / Restore</div>
          <p className="mt-1 max-w-2xl text-sm text-[--text-secondary]">Export JSON, import new data from a JSON file, or restore a full backup.</p>
        </div>
        <div className="grid min-w-[220px] gap-2 text-sm text-[--text-secondary] sm:grid-cols-3 lg:grid-cols-1">
          <div className="surface-soft px-3 py-2">JSON backup</div>
          <div className="surface-soft px-3 py-2">Import or restore</div>
          <div className="surface-soft px-3 py-2">User-scoped only</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={download} disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? 'Preparing...' : 'Download JSON backup'}
        </button>
        <button onClick={() => fileRef.current?.click()} className="btn-secondary">
          Choose JSON file
        </button>
      </div>

      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => loadFile(e.target.files?.[0] ?? null)} />

      {loaded ? (
        <div className="surface-soft space-y-3 p-4 text-sm text-[--text-secondary]">
          <div>
            <div className="font-medium text-[--text-primary]">Loaded file ready</div>
            <div className="mt-1">{summary.accounts} accounts, {summary.categories} categories, {summary.transactions} transactions.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={loading} onClick={mergeImport} className="btn-primary text-sm">
              {loading ? 'Importing...' : 'Import (add to existing data)'}
            </button>
            <button disabled={loading} onClick={restore} className="btn-secondary text-sm text-[--text-primary]">
              {loading ? 'Restoring...' : 'Replace everything with this backup'}
            </button>
          </div>
          <p className="text-xs text-[--text-muted]">
            <span className="font-medium text-[--text-primary]">Import</span> adds accounts/categories/tags/transactions from the file
            without touching what you already have — safe to use with your existing data.{' '}
            <span className="font-medium text-[--text-primary]">Replace everything</span> deletes your current data first.
          </p>
        </div>
      ) : null}

      {status ? <div className="text-sm text-[--text-secondary]">{status}</div> : null}
    </div>
  );
}
