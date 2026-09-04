import { CrudPage } from '../../../../components/CrudPage';
import { QuickSpendSettings } from '../../../../components/QuickSpendSettings';
import { getAccounts } from '../../../../lib/data';

export const dynamic = 'force-dynamic';

export default async function QuickSpendPage() {
  const accounts = await getAccounts();
  return (
    <CrudPage
      title="Quick spend"
      description="Configure the fast-capture buttons shown in Quick Add."
      rows={[]}
      backHref="/manage"
      backLabel="Manage"
    >
      <QuickSpendSettings accounts={accounts} />
    </CrudPage>
  );
}
