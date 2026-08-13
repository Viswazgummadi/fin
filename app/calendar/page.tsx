import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { getTransactions } from '../../lib/data';
import { buildMonthGrid, formatMoney, summarizeDailySpend } from '../../lib/insights';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const transactions = await getTransactions({ limit: 2000 });
  const spendMap = summarizeDailySpend(transactions);
  const grid = buildMonthGrid(new Date(), spendMap);
  const activeDays = [...spendMap.values()].filter(Boolean).length;
  const totalSpend = [...spendMap.values()].reduce((sum, value) => sum + value, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Calendar</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Heatmap-style daily review. Tap a day to open the journal for that date.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Metric title="Month" value={grid.monthLabel} />
          <Metric title="Active days" value={String(activeDays)} />
          <Metric title="Total spend" value={formatMoney(totalSpend)} />
        </div>

        <section className="rounded-xl border border-border bg-bg-secondary p-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-text-secondary">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => <div key={d}>{d}</div>)}
            {grid.days.map((day) => (
              <Link
                key={day.key}
                href={`/whathappened?date=${day.key}`}
                className={`min-h-14 rounded-lg border p-2 transition ${day.inMonth ? 'border-border' : 'border-border/40 text-text-muted'} ${day.spend > 0 ? 'bg-accent/10' : 'bg-bg-primary/50'} hover:bg-bg-tertiary`}
              >
                <div className="font-medium text-text-primary">{day.label}</div>
                <div className="mt-1 font-mono text-[11px]">{day.spend ? formatMoney(day.spend) : '—'}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <div className="text-sm text-text-secondary">{title}</div>
      <div className="mt-2 font-mono text-2xl">{value}</div>
    </div>
  );
}
