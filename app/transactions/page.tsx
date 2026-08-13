import { AppShell } from '../../components/AppShell';
import { CrudPage } from '../../components/CrudPage';
import { TransactionsClient } from '../../components/TransactionsClient';
import { getAccounts, getCategories, getTransactions } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const [transactions, accounts, categories] = await Promise.all([getTransactions(), getAccounts(), getCategories()]);
  return (
    <AppShell>
      <CrudPage title="Transactions" description="Filterable transaction list with edit, soft delete, undo, search, and shareable query params." rows={[]}>
        <TransactionsClient initialTransactions={transactions} accounts={accounts} categories={categories} />
      </CrudPage>
    </AppShell>
  );
}
