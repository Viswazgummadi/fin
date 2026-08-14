import Link from 'next/link';
import { AppShell } from '../../components/AppShell';

const shortcuts = [
  ['Full add', '/add', 'Open the full transaction form for income, transfers, and detailed entries.'],
  ['Analysis', '/analysis', 'Deep insights into your spending patterns and calendar.'],
  ['Manage Data', '/manage', 'Accounts, categories, quick spend buttons, and structure.'],
  ['Settings', '/settings', 'Backup, app theme, and system shortcuts.'],
];

export default function MorePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">More</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Secondary actions and tools optimized for mobile so you can reach everything quickly on a Samsung S25 Ultra.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map(([label, href, desc]) => (
            <Link key={href} href={href} className="rounded-xl border border-border bg-bg-secondary p-4 hover:bg-bg-tertiary">
              <div className="font-medium">{label}</div>
              <div className="mt-1 text-sm text-text-secondary">{desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
