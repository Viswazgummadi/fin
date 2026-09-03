import Link from 'next/link';
import { ChartPie, CalendarDays, LayoutGrid, Settings, type LucideIcon } from 'lucide-react';

const shortcuts: [string, string, string, LucideIcon][] = [
  ['Analysis', '/analysis', 'Deep insights into your spending patterns and calendar.', ChartPie],
  ['Calendar', '/calendar', 'Jump into spending by day and review the month visually.', CalendarDays],
  ['Manage Data', '/manage', 'Accounts, categories, quick spend buttons, and structure.', LayoutGrid],
  ['Settings', '/settings', 'Backup, app theme, and system shortcuts.', Settings],
];

export default function MorePage() {
  return (
    <div className="space-y-6 fade-up">
      <div className="page-header">
        <h1 className="page-title">More</h1>
        <p className="page-copy">Secondary actions.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        {shortcuts.map(([label, href, desc, Icon]) => (
          <Link key={href} href={href} className="surface-card flex items-start gap-3 p-4 hover:-translate-y-0.5">
            <span className="surface-soft flex h-10 w-10 shrink-0 items-center justify-center">
              <Icon size={18} className="text-[--accent-2]" />
            </span>
            <div className="min-w-0">
              <div className="kicker">Section</div>
              <div className="mt-1 font-medium">{label}</div>
              <div className="mt-1 text-sm text-[--text-secondary]">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
