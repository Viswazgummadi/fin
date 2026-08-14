import type { Account, Transaction } from '../lib/types';
import { calculateMonthlyTotals, calculateTotalBalance } from '../lib/finance';
import { getTransactionsForMonth, formatMoney } from '../lib/insights';

export function DashboardStats({ accounts, transactions }: { accounts: Account[]; transactions: Transaction[] }) {
  const balance = calculateTotalBalance(accounts, transactions);
  const monthlyTotals = calculateMonthlyTotals(getTransactionsForMonth(transactions));

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Stat title="Total balance" value={formatMoney(balance)} subtitle="All accounts combined" />
      <Stat title="Income" value={formatMoney(monthlyTotals.income)} subtitle="This month" />
      <Stat title="Spent" value={formatMoney(monthlyTotals.spent)} subtitle="This month" />
      <Stat title="Saved" value={formatMoney(monthlyTotals.saved)} subtitle="This month" />
    </div>
  );
}

function Stat({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-[--radius] border-thin bg-[--bg-secondary] p-4">
      <div className="text-sm text-[--text-secondary]">{title}</div>
      <div className="mt-2 font-mono text-2xl">{value}</div>
      <div className="mt-1 text-xs text-[--text-muted]">{subtitle}</div>
    </div>
  );
}
