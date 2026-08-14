import type {
  Account,
  Category,
  Goal,
  Limit,
  Person,
  PersonLedger,
  RecurringRule,
  Tag,
  Transaction,
} from './types';
import { createSupabaseServerClient } from '../utils/supabase/server';

export async function getAccounts(): Promise<Account[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('accounts').select('*').eq('archived', false).order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
  return data ?? [];
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('categories').select('*').eq('archived', false).order('sort_order', { ascending: true });
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data ?? [];
}

export async function getTags(): Promise<Tag[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('tags').select('*').order('name', { ascending: true });
  if (error) return [];
  return data ?? [];
}

type TransactionOptions = {
  limit?: number;
  includeDeleted?: boolean;
  select?: string;
  occurredFrom?: string;
  occurredTo?: string;
};

export async function getTransactions(options: TransactionOptions = {}): Promise<Transaction[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  let query = supabase
    .from('transactions')
    .select(options.select ?? '*')
    .order('occurred_at', { ascending: false })
    .limit(options.limit ?? 500);

  if (options.occurredFrom) {
    query = query.gte('occurred_at', options.occurredFrom);
  }

  if (options.occurredTo) {
    query = query.lt('occurred_at', options.occurredTo);
  }

  const { data, error } = options.includeDeleted ? await query : await query.is('deleted_at', null);
  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
  return ((data as unknown) as Transaction[] | null) ?? [];
}

export async function getPeople(): Promise<Person[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('people').select('*').eq('archived', false).order('name', { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function getPeopleLedger(): Promise<PersonLedger[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('people_ledger').select('*').order('occurred_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function getGoals(): Promise<Goal[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('goals').select('*').eq('archived', false).order('created_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function getGoalContributions(): Promise<{ id: string; goal_id: string; amount: string; occurred_at: string; linked_transaction_id: string | null }[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('goal_contributions').select('*').order('occurred_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function getLimits(): Promise<Limit[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('limits').select('*').order('active', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function getRecurringRules(): Promise<RecurringRule[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('recurring_rules').select('*').order('active', { ascending: false }).order('next_run_date', { ascending: true });
  if (error) return [];
  return data ?? [];
}
