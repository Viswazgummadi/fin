import Link from 'next/link';
import { Wallet, Tags, Tag, Users, Repeat, Target, ShieldAlert, CalendarDays, Zap, type LucideIcon } from 'lucide-react';

const manageLinks: [string, string, LucideIcon][] = [
  ['Quick spend', '/manage/quick-spend', Zap],
  ['Accounts', '/accounts', Wallet],
  ['Categories', '/categories', Tags],
  ['Tags', '/tags', Tag],
  ['People', '/people', Users],
  ['Recurring Rules', '/recurring-rules', Repeat],
  ['Goals', '/goals', Target],
  ['Limits', '/limits', ShieldAlert],
  ['Calendar', '/calendar', CalendarDays],
];

export default function ManagePage() {
  return (
    <div className="space-y-6 fade-up">
      <div className="page-header">
        <h1 className="page-title">Manage</h1>
        <p className="page-copy">Configure accounts, structure, and quick-spend shortcuts.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {manageLinks.map(([label, href, Icon]) => (
          <Link key={label} href={href} className="surface-card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
            <span className="surface-soft flex h-10 w-10 shrink-0 items-center justify-center">
              <Icon size={18} className="text-[--accent-2]" />
            </span>
            <div className="min-w-0">
              <div className="font-medium">{label}</div>
              <div className="mt-0.5 truncate text-xs text-[--text-muted]">Open {label.toLowerCase()}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
