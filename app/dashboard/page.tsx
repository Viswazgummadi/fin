import { AppShell } from '../../components/AppShell';
import { DashboardStats } from '../../components/DashboardStats';
import { getAccounts, getTransactions } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [accounts, transactions] = await Promise.all([getAccounts(), getTransactions()]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Home overview with total balance, this month summary, limit warnings, recent activity, and goal progress.</p>
        </div>
        <DashboardStats accounts={accounts} transactions={transactions} />
      </div>
    </AppShell>
  );
}
