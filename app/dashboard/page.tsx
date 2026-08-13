import { AppShell } from '../../components/AppShell';
import { SectionPage } from '../../components/SectionPage';

export default function DashboardPage() {
  return (
    <AppShell>
      <SectionPage
        title="Dashboard"
        description="Home overview with total balance, this month summary, limit warnings, recent activity, and goal progress."
        items={[
          { title: 'Total balance', description: 'Large mono balance with per-account breakdown.' },
          { title: 'This month', description: 'Income, spent, saved, and pacing against last month.' },
          { title: 'Recent transactions', description: 'Last 10 entries with quick jump to full list.' },
        ]}
      />
    </AppShell>
  );
}
