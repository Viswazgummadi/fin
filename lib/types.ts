export type AccountType = 'bank' | 'cash' | 'wallet' | 'credit' | 'other';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryKind = 'expense' | 'income' | 'both';

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  opening_balance: string;
  currency: string;
  archived: boolean;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  kind: CategoryKind;
  parent_id: string | null;
  is_essential: boolean | null;
  archived: boolean;
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
  deleted_at: string | null;
};
