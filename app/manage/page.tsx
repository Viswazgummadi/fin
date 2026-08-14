import { AppShell } from '../../components/AppShell';
import { QuickSpendSettings } from '../../components/QuickSpendSettings';
import { getAccounts } from '../../lib/data';
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

export const dynamic = 'force-dynamic';

export default async function ManagePage() {
  const accounts = await getAccounts();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Manage</h1>
          <p className="mt-2 text-sm text-text-secondary">Configure your finance journal structure.</p>
        </div>
        <QuickSpendSettings accounts={accounts} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {manageLinks.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="block rounded-xl border border-thin bg-[--bg-secondary] p-4 transition hover:border-[--accent]"
            >
              <div className="font-medium">{label}</div>
              <div className="mt-1 text-xs text-[--text-muted]">Configure {label.toLowerCase()} settings</div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
