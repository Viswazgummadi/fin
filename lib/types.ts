export type AccountType = 'bank' | 'cash' | 'wallet' | 'credit' | 'other';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryKind = 'expense' | 'income' | 'both';
export type PersonLedgerType = 'lent' | 'borrowed' | 'shared_expense' | 'reimbursement' | 'settlement';
export type LimitScope = 'category' | 'tag' | 'overall';
export type LimitPeriod = 'weekly' | 'monthly';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  opening_balance: string;
  currency: string;
  color: string | null;
  icon: string | null;
  archived: boolean;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  kind: CategoryKind;
  parent_id: string | null;
  is_essential: boolean | null;
  color: string | null;
  icon: string | null;
  archived: boolean;
  sort_order: number;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  transfer_account_id: string | null;
  type: TransactionType;
  amount: string;
  category_id: string | null;
  note: string | null;
  occurred_at: string;
  is_planned: boolean | null;
  recurring_rule_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Person = {
  id: string;
  user_id: string;
  name: string;
  avatar_color: string | null;
  archived: boolean;
};

export type PersonLedger = {
  id: string;
  user_id: string;
  person_id: string;
  type: PersonLedgerType;
  amount: string;
  note: string | null;
  linked_transaction_id: string | null;
  occurred_at: string;
  settled: boolean;
};

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: string;
  current_amount: string;
  monthly_contribution: string | null;
  target_date: string | null;
  linked_account_id: string | null;
  archived: boolean;
  created_at: string;
};

export type GoalContribution = {
  id: string;
  goal_id: string;
  amount: string;
  occurred_at: string;
  linked_transaction_id: string | null;
};

export type Limit = {
  id: string;
  user_id: string;
  scope: LimitScope;
  scope_ref_id: string | null;
  period: LimitPeriod;
  amount: string;
  active: boolean;
};

export type RecurringRule = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: string;
  note: string | null;
  frequency: RecurringFrequency;
  interval_count: number;
  day_of_month: number | null;
  weekday: number | null;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  active: boolean;
};

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
};
