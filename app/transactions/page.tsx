import { AppShell } from '../../components/AppShell';
import { SetupStarterData } from '../../components/SetupStarterData';
import { TransactionsClient } from '../../components/TransactionsClient';
import { getAccounts, getCategories, getTransactions } from '../../lib/data';
import { getCurrentMonthKey, getMonthRangeForQuery } from '../../lib/insights';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const initialMonthKey = getCurrentMonthKey();
  const initialRange = getMonthRangeForQuery(initialMonthKey);

  const [transactions, accounts, categories] = await Promise.all([
    getTransactions({
      select: 'id,account_id,transfer_account_id,type,amount,category_id,note,occurred_at,is_planned,deleted_at',
      occurredFrom: initialRange.startIso,
      occurredTo: initialRange.endIso,
      limit: 500,
    }),
    getAccounts(),
    getCategories(),
  ]);
  return (
    <AppShell>
      <div className="space-y-6 fade-up">
        <div className="page-header">
          <h1 className="page-title">Transactions</h1>
          <p className="page-copy">Dense, fast, and practical. Quick spend lives in the header; full manual entry lives here. Transactions now open in a bounded monthly window for faster loads.</p>
        </div>
        {!accounts.length || !categories.length ? <SetupStarterData /> : null}
        <TransactionsClient initialTransactions={transactions} initialMonthKey={initialMonthKey} accounts={accounts} categories={categories} />
      </div>
    </AppShell>
  );
}
