import { AppShell } from '../../components/AppShell';
import { MainAddClient } from '../../components/MainAddClient';
import { getAccounts, getCategories } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function AddPage() {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);

  return (
    <AppShell>
      <MainAddClient accounts={accounts} categories={categories} />
    </AppShell>
  );
}
