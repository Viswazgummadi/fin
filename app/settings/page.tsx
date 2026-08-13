import { AppShell } from '../../components/AppShell';
import { SectionPage } from '../../components/SectionPage';

export default function SettingsPage() {
  return (
    <AppShell>
      <SectionPage
        title="Settings"
        description="Export/import, theme, currency, keyboard shortcuts, and future AI summary toggle."
        items={[
          { title: 'Backup', description: 'JSON export/import with dry-run preview.' },
          { title: 'Shortcuts', description: 'Keyboard help and power-user navigation.' },
          { title: 'AI summaries', description: 'Optional narrative summaries, off by default.' },
        ]}
      />
    </AppShell>
  );
}
