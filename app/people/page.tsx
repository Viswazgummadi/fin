import { AppShell } from '../../components/AppShell';
import { SectionPage } from '../../components/SectionPage';

export default function PeoplePage() {
  return (
    <AppShell>
      <SectionPage
        title="People"
        description="Track lend/borrow/shared expense/reimbursement/settlement ledgers per person."
        items={[
          { title: 'Per-person ledger', description: 'Net outstanding with clear signed totals.' },
          { title: 'Settle up', description: 'Create settlement entries and optional linked transactions.' },
          { title: 'Ledger detail', description: 'Chronological history with notes and linked transactions.' },
        ]}
      />
    </AppShell>
  );
}
