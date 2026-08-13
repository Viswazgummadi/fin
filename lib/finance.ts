import type { Account, Transaction } from './types';

export function calculateTotalBalance(accounts: Account[], transactions: Transaction[]) {
  const opening = accounts.reduce((sum, account) => sum + Number(account.opening_balance || 0), 0);
  const movement = transactions.reduce((sum, txn) => {
    const amount = Number(txn.amount || 0);
    if (txn.type === 'income') return sum + amount;
    if (txn.type === 'expense') return sum - amount;
    return sum;
  }, 0);
  return opening + movement;
}

export function calculateMonthlyTotals(transactions: Transaction[]) {
  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const spent = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const transferred = transactions.filter((t) => t.type === 'transfer').reduce((sum, t) => sum + Number(t.amount), 0);
  return { income, spent, transferred, saved: income - spent };
}
