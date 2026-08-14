import type { Account, Category, Transaction } from './types';
import { calculateMonthlyTotals, calculateTotalBalance } from './finance';

const IST_OFFSET_MINUTES = 330;
const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number) {
  return moneyFormatter.format(amount || 0);
}

export function shiftToIST(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return new Date(d.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
}

export function toDateKey(date: Date | string) {
  return shiftToIST(date).toISOString().slice(0, 10);
}

export function getMonthKey(date: Date | string) {
  const d = shiftToIST(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getCurrentMonthKey(reference = new Date()) {
  return getMonthKey(reference);
}

export function isInMonth(date: Date | string, monthKey: string) {
  return getMonthKey(date) === monthKey;
}

export function getRecentTransactions(transactions: Transaction[], limit = 10) {
  return transactions.filter((t) => !t.deleted_at).slice(0, limit);
}

export function getTransactionsForDate(transactions: Transaction[], dateKey: string) {
  return transactions.filter((txn) => toDateKey(txn.occurred_at) === dateKey && !txn.deleted_at);
}

export function getTransactionsForMonth(transactions: Transaction[], reference = new Date()) {
  const monthKey = getCurrentMonthKey(reference);
  return transactions.filter((txn) => isInMonth(txn.occurred_at, monthKey) && !txn.deleted_at);
}

export function summarizeCategories(transactions: Transaction[], categories: Category[]) {
  const categoryNameMap = new Map(categories.map((category) => [category.id, category.name]));
  const totals = new Map<string, { category: string; amount: number; count: number }>();
  for (const txn of transactions) {
    if (txn.type !== 'expense' || txn.deleted_at) continue;
    const key = txn.category_id ?? 'uncategorized';
    const existing = totals.get(key) ?? { category: categoryNameMap.get(key) ?? 'Uncategorized', amount: 0, count: 0 };
    existing.amount += Number(txn.amount || 0);
    existing.count += 1;
    totals.set(key, existing);
  }
  return [...totals.values()].sort((a, b) => b.amount - a.amount);
}

export function summarizeWeekdays(transactions: Transaction[]) {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const totals = labels.map((label) => ({ label, amount: 0, count: 0 }));
  for (const txn of transactions) {
    if (txn.type !== 'expense' || txn.deleted_at) continue;
    const day = shiftToIST(txn.occurred_at).getDay();
    totals[day].amount += Number(txn.amount || 0);
    totals[day].count += 1;
  }
  return totals;
}

export function summarizeTopNotes(transactions: Transaction[]) {
  const map = new Map<string, { note: string; amount: number; count: number }>();
  for (const txn of transactions) {
    if (txn.deleted_at) continue;
    const note = (txn.note ?? '').trim();
    if (!note) continue;
    const key = note.toLowerCase();
    const current = map.get(key) ?? { note, amount: 0, count: 0 };
    current.amount += Number(txn.amount || 0);
    current.count += 1;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.amount - a.amount).slice(0, 10);
}

export function summarizeDailySpend(transactions: Transaction[]) {
  const map = new Map<string, number>();
  for (const txn of transactions) {
    if (txn.deleted_at || txn.type !== 'expense') continue;
    const key = toDateKey(txn.occurred_at);
    map.set(key, (map.get(key) ?? 0) + Number(txn.amount || 0));
  }
  return map;
}

export function summarizeDailyTransactions(transactions: Transaction[], dateKey: string) {
  const list = getTransactionsForDate(transactions, dateKey).sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );
  const income = list.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const spent = list.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const transferred = list.filter((t) => t.type === 'transfer').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  return { list, income, spent, transferred };
}

export function buildMonthGrid(reference: Date, spendMap: Map<string, number>) {
  const anchored = shiftToIST(reference);
  const year = anchored.getFullYear();
  const month = anchored.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = toDateKey(day);
    return {
      date: day,
      key,
      inMonth: day.getMonth() === month,
      spend: spendMap.get(key) ?? 0,
      label: day.getDate(),
    };
  });

  return {
    year,
    month,
    monthLabel: new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(first),
    days,
  };
}

export function calculateProjection(accounts: Account[], transactions: Transaction[]) {
  const balance = calculateTotalBalance(accounts, transactions);
  const totals = calculateMonthlyTotals(getTransactionsForMonth(transactions));
  const last30 = transactions.filter((txn) => {
    if (txn.deleted_at) return false;
    const daysAgo = (Date.now() - new Date(txn.occurred_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 30;
  });
  const net30 = last30.reduce((sum, txn) => {
    const amount = Number(txn.amount || 0);
    if (txn.type === 'income') return sum + amount;
    if (txn.type === 'expense') return sum - amount;
    return sum;
  }, 0);
  const dailyNet = net30 / 30;

  return {
    balance,
    totals,
    net30,
    projected30: balance + dailyNet * 30,
    projected60: balance + dailyNet * 60,
    projected90: balance + dailyNet * 90,
  };
}
