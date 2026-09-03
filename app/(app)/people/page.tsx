import { PeopleClient } from '../../../components/PeopleClient';
import { getPeople, getPeopleLedger } from '../../../lib/data';
import { BackLink } from '../../../components/BackLink';

export const dynamic = 'force-dynamic';

export default async function PeoplePage() {
  const [people, ledger] = await Promise.all([getPeople(), getPeopleLedger()]);
  return (
    <div className="space-y-6 fade-up">
      <div className="page-header">
        <BackLink href="/manage" label="Manage" />
        <h1 className="page-title">People</h1>
        <p className="page-copy">Track who owes whom — lending, shared expenses, and settlements.</p>
      </div>
      <PeopleClient initialPeople={people} initialLedger={ledger} />
    </div>
  );
}
