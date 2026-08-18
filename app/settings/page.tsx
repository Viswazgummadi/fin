import { AppShell } from '../../components/AppShell';
import { BackupRestoreClient } from '../../components/BackupRestoreClient';

export default async function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6 fade-up">
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-copy">Backups, restore, and app settings.</p>
        </div>
        <BackupRestoreClient />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card title="Shortcuts" text="Quick spend in the header, full entry in transactions." />
          <Card title="Theme" text="Dark-first, low-glare, mono-number design." />
          <Card title="AI summaries" text="Kept out for this MVP." />
        </div>
      </div>
    </AppShell>
  );
}

function Card({ title, text }: { title: string; text: string }) {
  return (
    <div className="surface-card p-4">
      <div className="kicker">Settings note</div>
      <div className="mt-2 font-medium">{title}</div>
      <div className="mt-1 text-sm text-[--text-secondary]">{text}</div>
    </div>
  );
}
