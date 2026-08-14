import { AppShell } from '../../components/AppShell';
import Link from 'next/link';

const manageLinks = [
  ['Accounts', '/accounts'],
  ['Categories', '/categories'],
  ['Tags', '/tags'],
  ['People', '/people'],
  ['Recurring Rules', '/recurring-rules'],
  ['Goals', '/goals'],
  ['Limits', '/limits'],
];

export default function ManagePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Manage</h1>
          <p className="mt-2 text-sm text-text-secondary">Configure your finance journal structure.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {manageLinks.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="block p-4 rounded-xl border border-thin bg-[--bg-secondary] hover:border-[--accent] transition"
            >
              <div className="font-medium">{label}</div>
              <div className="text-xs text-[--text-muted] mt-1">Configure {label.toLowerCase()} settings</div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
