import { AppShell } from '../../components/AppShell';
import { BackupRestoreClient } from '../../components/BackupRestoreClient';
import { getAccounts, getCategories, getTransactions } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [accounts, categories, transactions] = await Promise.all([getAccounts(), getCategories(), getTransactions({ limit: 2000 })]);
  const snapshot = { accounts, categories, transactions };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Backup/export, shortcuts, and future import/AI features.</p>
        </div>
        <BackupRestoreClient snapshot={snapshot} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card title="Shortcuts" text="n = new transaction, / = search, esc = close modal, g d = dashboard." />
          <Card title="Theme" text="Dark-first design is enabled by default for low-light and mobile use." />
          <Card title="AI summaries" text="Optional narrative summaries can be added later and kept off by default." />
        </div>
      </div>
    </AppShell>
  );
}

function Card({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm text-text-secondary">{text}</div>
    </div>
  );
}
