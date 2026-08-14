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
      <div className="space-y-6 fade-up">
        <div className="page-header">
          <h1 className="page-title">More</h1>
          <p className="page-copy">A calm overflow space for secondary actions, optimized for fast mobile access without crowding the main navigation.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          {shortcuts.map(([label, href, desc]) => (
            <Link key={href} href={href} className="surface-card p-4 hover:-translate-y-0.5">
              <div className="kicker">Workspace</div>
              <div className="mt-2 font-medium">{label}</div>
              <div className="mt-1 text-sm text-[--text-secondary]">{desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
