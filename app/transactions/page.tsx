import { AppShell } from '../../components/AppShell';
import { CrudPage } from '../../components/CrudPage';
import { SetupStarterData } from '../../components/SetupStarterData';
import { TransactionsClient } from '../../components/TransactionsClient';
import { getAccounts, getCategories, getTransactions } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const [transactions, accounts, categories] = await Promise.all([getTransactions(), getAccounts(), getCategories()]);
  return (
    <AppShell>
      <CrudPage
        title="Transactions"
        description="This is the browser test page for money entry: create an account, create a category, add a transaction, see it listed immediately."
        rows={[]}
      >
        {!accounts.length || !categories.length ? <SetupStarterData /> : null}
        <TransactionsClient initialTransactions={transactions} accounts={accounts} categories={categories} />
      </CrudPage>
    </AppShell>
  );
}
