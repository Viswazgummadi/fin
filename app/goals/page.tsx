import { AppShell } from '../../components/AppShell';
import { GoalsClient } from '../../components/GoalsClient';
import { getAccounts, getGoals } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const [goals, accounts] = await Promise.all([getGoals(), getAccounts()]);
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Goals</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Set savings goals, track contributions, and see progress with ETA.</p>
        </div>
        <GoalsClient initialGoals={goals} accounts={accounts} />
      </div>
    </AppShell>
  );
}
