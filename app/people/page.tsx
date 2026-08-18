import { AppShell } from '../../components/AppShell';
import { PeopleClient } from '../../components/PeopleClient';
import { getPeople, getPeopleLedger } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function PeoplePage() {
  const [people, ledger] = await Promise.all([getPeople(), getPeopleLedger()]);
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">People</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Track balances with people.</p>
        </div>
        <PeopleClient initialPeople={people} initialLedger={ledger} />
      </div>
    </AppShell>
  );
}
