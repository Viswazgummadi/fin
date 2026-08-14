import { AppShell } from '../../components/AppShell';
import { RecurringRulesClient } from '../../components/RecurringRulesClient';
import { getAccounts, getCategories, getRecurringRules } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function RecurringRulesPage() {
  const [rules, accounts, categories] = await Promise.all([getRecurringRules(), getAccounts(), getCategories()]);
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Recurring rules</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Define repeat transactions you expect every week, month, or year.</p>
        </div>
        <RecurringRulesClient initialRules={rules} accounts={accounts} categories={categories} />
      </div>
    </AppShell>
  );
}
