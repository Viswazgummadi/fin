import { GoalsClient } from '../../../components/GoalsClient';
import { getAccounts, getGoals } from '../../../lib/data';
import { BackLink } from '../../../components/BackLink';

export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const [goals, accounts] = await Promise.all([getGoals(), getAccounts()]);
  return (
    <div className="space-y-6 fade-up">
      <div className="page-header">
        <BackLink href="/manage" label="Manage" />
        <h1 className="page-title">Goals</h1>
        <p className="page-copy">Savings goals, contributions, and projected time to reach them.</p>
      </div>
      <GoalsClient initialGoals={goals} accounts={accounts} />
    </div>
  );
}
