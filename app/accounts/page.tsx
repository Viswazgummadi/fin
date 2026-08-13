import { AppShell } from '../../components/AppShell';
import { CrudPage } from '../../components/CrudPage';
import { AccountsClient } from '../../components/AccountsClient';
import { getAccounts } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const accounts = await getAccounts();
  return (
    <AppShell>
      <CrudPage
        title="Accounts"
        description="Bank, cash, wallet, credit, and other accounts with opening balances and archive support."
        rows={[]}
      >
        <AccountsClient initialAccounts={accounts} />
      </CrudPage>
    </AppShell>
  );
}
