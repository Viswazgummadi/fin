import { AppShell } from '../../components/AppShell';
import { SetupStarterData } from '../../components/SetupStarterData';
import { TransactionsClient } from '../../components/TransactionsClient';
import { getAccounts, getCategories, getTransactions } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const [transactions, accounts, categories] = await Promise.all([getTransactions(), getAccounts(), getCategories()]);
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Transactions</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Search, filter, add, edit, delete, and restore with a dense mobile-friendly flow.</p>
        </div>
        {!accounts.length || !categories.length ? <SetupStarterData /> : null}
        <TransactionsClient initialTransactions={transactions} accounts={accounts} categories={categories} />
      </div>
    </AppShell>
  );
}
