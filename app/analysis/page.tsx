import { AppShell } from '../../components/AppShell';
import { SectionPage } from '../../components/SectionPage';

export default function AnalysisPage() {
  return (
    <AppShell>
      <SectionPage
        title="Analysis"
        description="Deep analysis page for money flow, trends, comparisons, patterns, and anomaly detection."
        items={[
          { title: 'Sankey flow', description: 'Income → buckets → subcategories visualization.' },
          { title: 'Trend charts', description: 'Month-to-month comparison, weekday/weekend, and rolling averages.' },
          { title: 'Pattern flags', description: 'Highlight unusual category spikes with simple anomaly detection.' },
        ]}
      />
    </AppShell>
  );
}
