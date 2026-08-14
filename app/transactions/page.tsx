import { AppShell } from '../../components/AppShell';
import { SetupStarterData } from '../../components/SetupStarterData';
import { TransactionsClient } from '../../components/TransactionsClient';
import { getAccounts, getCategories, getTransactions } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const [transactions, accounts, categories] = await Promise.all([
    getTransactions({
      select: 'id,account_id,transfer_account_id,type,amount,category_id,note,occurred_at,is_planned,deleted_at',
    }),
    getAccounts(),
    getCategories(),
  ]);
  return (
    <AppShell>
      <div className="space-y-6 fade-up">
        <div className="page-header">
          <h1 className="page-title">Transactions</h1>
          <p className="page-copy">Dense, fast, and practical. Search deeply, filter cleanly, and edit without leaving context.</p>
        </div>
        {!accounts.length || !categories.length ? <SetupStarterData /> : null}
        <TransactionsClient initialTransactions={transactions} accounts={accounts} categories={categories} />
      </div>
    </AppShell>
  );
}
