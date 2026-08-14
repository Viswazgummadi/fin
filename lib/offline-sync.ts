import type { SupabaseClient } from '@supabase/supabase-js';
import type { QuickSpendConfig } from './quick-spend';

export const OFFLINE_OUTBOX_KEY = 'fin.offline-outbox.v1';
export const OFFLINE_OUTBOX_EVENT = 'fin:offline-outbox-updated';

export type TransactionInsertPayload = {
  account_id: string;
  transfer_account_id: string | null;
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  note: string | null;
  category_id: string | null;
  is_planned: boolean;
  occurred_at?: string;
};

export type TransactionUpdatePayload = TransactionInsertPayload & {
  updated_at?: string;
};

export type OfflineOutboxItem =
  | {
      id: string;
      kind: 'transaction-insert';
      localId?: string;
      payload: TransactionInsertPayload;
      createdAt: string;
    }
  | {
      id: string;
      kind: 'transaction-update';
      transactionId: string;
      payload: TransactionUpdatePayload;
      createdAt: string;
    }
  | {
      id: string;
      kind: 'transaction-soft-delete';
      transactionId: string;
      createdAt: string;
    }
  | {
      id: string;
      kind: 'transaction-restore';
      transactionId: string;
      createdAt: string;
    }
  | {
      id: string;
      kind: 'quick-spend-config';
      payload: QuickSpendConfig;
      createdAt: string;
    };

function emitOutboxEvent() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OFFLINE_OUTBOX_EVENT));
}

export function readOfflineOutbox(): OfflineOutboxItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(OFFLINE_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OfflineOutboxItem[]) : [];
  } catch {
    return [];
  }
}

export function writeOfflineOutbox(items: OfflineOutboxItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OFFLINE_OUTBOX_KEY, JSON.stringify(items));
  emitOutboxEvent();
}

export function getOfflineOutboxCount() {
  return readOfflineOutbox().length;
}

export function enqueueOfflineOutboxItem(item: OfflineOutboxItem) {
  const current = readOfflineOutbox();
  const next =
    item.kind === 'quick-spend-config'
      ? [...current.filter((entry) => entry.kind !== 'quick-spend-config'), item]
      : [...current, item];

  writeOfflineOutbox(next);
}

export function removeQueuedTransactionInsert(localId: string) {
  const next = readOfflineOutbox().filter(
    (entry) => !(entry.kind === 'transaction-insert' && entry.localId === localId)
  );
  writeOfflineOutbox(next);
}

export function isLocalOnlyTransactionId(id: string) {
  return id.startsWith('local-');
}

async function upsertQuickSpendConfigRemote(supabase: SupabaseClient, config: QuickSpendConfig) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error('You must be logged in to sync quick spend settings.');

  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: user.id,
      quick_spend_config: config,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) throw error;
}

export async function fetchRemoteQuickSpendConfig(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('user_preferences').select('quick_spend_config').maybeSingle();
  if (error) throw error;
  return (data?.quick_spend_config as QuickSpendConfig | null | undefined) ?? null;
}

export async function flushOfflineOutbox(supabase: SupabaseClient) {
  const queue = readOfflineOutbox();
  if (!queue.length) return { flushed: 0, remaining: [] as OfflineOutboxItem[] };

  const remaining = [...queue];
  let flushed = 0;

  for (const item of queue) {
    try {
      if (item.kind === 'transaction-insert') {
        const { error } = await supabase.from('transactions').insert(item.payload);
        if (error) throw error;
      }

      if (item.kind === 'transaction-update') {
        const { error } = await supabase
          .from('transactions')
          .update({ ...item.payload, updated_at: item.payload.updated_at ?? new Date().toISOString() })
          .eq('id', item.transactionId);
        if (error) throw error;
      }

      if (item.kind === 'transaction-soft-delete') {
        const { error } = await supabase
          .from('transactions')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', item.transactionId);
        if (error) throw error;
      }

      if (item.kind === 'transaction-restore') {
        const { error } = await supabase.from('transactions').update({ deleted_at: null }).eq('id', item.transactionId);
        if (error) throw error;
      }

      if (item.kind === 'quick-spend-config') {
        await upsertQuickSpendConfigRemote(supabase, item.payload);
      }

      remaining.shift();
      flushed += 1;
    } catch (error) {
      writeOfflineOutbox(remaining);
      return { flushed, remaining, error };
    }
  }

  writeOfflineOutbox(remaining);
  return { flushed, remaining };
}
