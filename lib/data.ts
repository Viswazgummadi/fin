import type { Account, Category, Transaction } from './types';
import { createSupabaseServerClient } from '../utils/supabase/server';

export async function getAccounts(): Promise<Account[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('accounts').select('*').eq('archived', false).order('created_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('archived', false)
    .order('sort_order', { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = createSupabaseServerClient();
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
