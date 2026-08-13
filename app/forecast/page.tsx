import { AppShell } from '../../components/AppShell';
import { SectionPage } from '../../components/SectionPage';

export default function ForecastPage() {
  return (
    <AppShell>
      <SectionPage
        title="Forecast"
        description="Transparent projection of future balance using recurring rules, known expenses, and planned savings."
        items={[
          { title: 'Expected income', description: 'Recurring salary and other inflows.' },
          { title: 'Known expenses', description: 'Bills, subscriptions, and committed outflows.' },
          { title: 'Safe discretionary', description: 'Formula-based balance you can spend safely.' },
        ]}
      />
    </AppShell>
  );
}
