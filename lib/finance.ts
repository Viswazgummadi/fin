import type { Account, Transaction } from './types';

export function calculateAccountBalances(accounts: Account[], transactions: Transaction[]) {
  const balances = new Map<string, number>();

  for (const account of accounts) {
    balances.set(account.id, Number(account.opening_balance || 0));
  }

  for (const txn of transactions) {
    const amount = Number(txn.amount || 0);
    if (!amount || txn.deleted_at) continue;

    if (txn.type === 'income') {
      balances.set(txn.account_id, (balances.get(txn.account_id) ?? 0) + amount);
      continue;
    }

    if (txn.type === 'expense') {
      balances.set(txn.account_id, (balances.get(txn.account_id) ?? 0) - amount);
      continue;
    }

    if (txn.type === 'transfer') {
      balances.set(txn.account_id, (balances.get(txn.account_id) ?? 0) - amount);
      if (txn.transfer_account_id) {
        balances.set(txn.transfer_account_id, (balances.get(txn.transfer_account_id) ?? 0) + amount);
      }
    }
  }

  return balances;
}

export function calculateTotalBalance(accounts: Account[], transactions: Transaction[]) {
  return [...calculateAccountBalances(accounts, transactions).values()].reduce((sum, value) => sum + value, 0);
}

export function calculateMonthlyTotals(transactions: Transaction[]) {
  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const spent = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const transferred = transactions.filter((t) => t.type === 'transfer').reduce((sum, t) => sum + Number(t.amount), 0);
  return { income, spent, transferred, saved: income - spent };
}
