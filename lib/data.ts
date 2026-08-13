import { supabase } from './supabase';
import type { Account, Category, Transaction } from './types';

export async function getAccounts(): Promise<Account[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('accounts').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function getCategories(): Promise<Category[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function getTransactions(): Promise<Transaction[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })
    .limit(50);
  if (error) return [];
  return data ?? [];
}
