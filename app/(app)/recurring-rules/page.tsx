import { RecurringRulesClient } from '../../../components/RecurringRulesClient';
import { getAccounts, getCategories, getRecurringRules } from '../../../lib/data';
import { BackLink } from '../../../components/BackLink';

export const dynamic = 'force-dynamic';

export default async function RecurringRulesPage() {
  const [rules, accounts, categories] = await Promise.all([getRecurringRules(), getAccounts(), getCategories()]);
  return (
    <div className="space-y-6 fade-up">
      <div className="page-header">
        <BackLink href="/manage" label="Manage" />
        <h1 className="page-title">Recurring rules</h1>
        <p className="page-copy">Repeat transactions you expect — rent, subscriptions, salary.</p>
      </div>
      <RecurringRulesClient initialRules={rules} accounts={accounts} categories={categories} />
    </div>
  );
}
