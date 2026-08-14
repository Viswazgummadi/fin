import { AppShell } from '../../components/AppShell';
import { CrudPage } from '../../components/CrudPage';
import { AccountsClient } from '../../components/AccountsClient';
import { getAccounts, getTransactions } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const [accounts, transactions] = await Promise.all([getAccounts(), getTransactions({ limit: 1000 })]);
  return (
    <AppShell>
      <CrudPage
        title="Accounts"
        description="Bank, cash, wallet, credit, and other accounts with opening balances, balances, edit, and archive support."
        rows={[]}
      >
        <AccountsClient initialAccounts={accounts} transactions={transactions} />
      </CrudPage>
    </AppShell>
  );
}
