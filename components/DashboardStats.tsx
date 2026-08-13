import type { Account, Transaction } from '../lib/types';
import { calculateMonthlyTotals, calculateTotalBalance } from '../lib/finance';

export function DashboardStats({ accounts, transactions }: { accounts: Account[]; transactions: Transaction[] }) {
  const balance = calculateTotalBalance(accounts, transactions);
  const totals = calculateMonthlyTotals(transactions);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Stat title="Total balance" value={`₹${balance.toFixed(2)}`} />
      <Stat title="Income" value={`₹${totals.income.toFixed(2)}`} />
      <Stat title="Spent" value={`₹${totals.spent.toFixed(2)}`} />
      <Stat title="Saved" value={`₹${totals.saved.toFixed(2)}`} />
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <div className="text-sm text-text-secondary">{title}</div>
      <div className="mt-2 font-mono text-2xl">{value}</div>
    </div>
  );
}
