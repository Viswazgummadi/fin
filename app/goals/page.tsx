import { AppShell } from '../../components/AppShell';
import { SectionPage } from '../../components/SectionPage';

export default function GoalsPage() {
  return (
    <AppShell>
      <SectionPage
        title="Goals"
        description="Savings goals, progress bars, contribution tracking, and ETA calculations."
        items={[
          { title: 'Progress', description: 'Target amount vs current amount, plus monthly contribution rate.' },
          { title: 'ETA', description: 'Projected months to reach the goal from recent contribution pace.' },
          { title: 'Link accounts', description: 'Optionally tie a savings account directly to a goal.' },
        ]}
      />
    </AppShell>
  );
}
