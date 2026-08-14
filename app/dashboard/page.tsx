import { AppShell } from '../../components/AppShell';
import { getAccounts, getCategories, getTransactions } from '../../lib/data';
import { getRecentTransactions, summarizeCategories } from '../../lib/insights';
import { DashboardClient } from '../../components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [accounts, categories, transactions] = await Promise.all([getAccounts(), getCategories(), getTransactions({ limit: 1000 })]);
  const recent = getRecentTransactions(transactions, 8);
  const topCategories = summarizeCategories(transactions, categories).slice(0, 5);

  return (
    <AppShell>
      <DashboardClient recent={recent} topCategories={topCategories} accounts={accounts} transactions={transactions} />
    </AppShell>
  );
}
