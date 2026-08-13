import { AppShell } from '../../components/AppShell';
import { SectionPage } from '../../components/SectionPage';

export default function LimitsPage() {
  return (
    <AppShell>
      <SectionPage
        title="Limits"
        description="Category, tag, or overall spending limits with weekly/monthly periods and breach history."
        items={[
          { title: 'Progress bars', description: 'Green to amber to red based on percentage used.' },
          { title: 'Overspending history', description: 'Keep a permanent log of breached periods.' },
          { title: 'Scope', description: 'Attach limits to categories, tags, or the whole app.' },
        ]}
      />
    </AppShell>
  );
}
