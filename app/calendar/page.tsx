import { AppShell } from '../../components/AppShell';
import { SectionPage } from '../../components/SectionPage';

export default function CalendarPage() {
  return (
    <AppShell>
      <SectionPage
        title="Calendar"
        description="GitHub-style heatmap for daily spend, with click-through to the daily journal view."
        items={[
          { title: 'Heatmap', description: 'Color intensity by total spend per day.' },
          { title: 'What happened?', description: 'Open a date to see all transactions and notes.' },
          { title: 'Daily summary', description: 'Income, spent, transferred, people ledger, and goal contributions.' },
        ]}
      />
    </AppShell>
  );
}
