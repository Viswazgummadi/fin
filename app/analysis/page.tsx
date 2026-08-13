import { AppShell } from '../../components/AppShell';
import { getAccounts, getCategories, getTransactions } from '../../lib/data';
import {
  buildMonthGrid,
  formatMoney,
  getCurrentMonthKey,
  summarizeCategories,
  summarizeDailySpend,
  summarizeTopNotes,
  summarizeWeekdays,
} from '../../lib/insights';

export const dynamic = 'force-dynamic';

export default async function AnalysisPage() {
  const [accounts, categories, transactions] = await Promise.all([getAccounts(), getCategories(), getTransactions({ limit: 2000 })]);
  const categoryRows = summarizeCategories(transactions, categories);
  const weekdayRows = summarizeWeekdays(transactions);
  const topNotes = summarizeTopNotes(transactions);
  const dailySpend = summarizeDailySpend(transactions);
  const monthGrid = buildMonthGrid(new Date(), dailySpend);
  const currentMonthKey = getCurrentMonthKey();
  const currentMonthExpenses = [...dailySpend.entries()].filter(([key]) => key.startsWith(currentMonthKey)).reduce((sum, [, amount]) => sum + amount, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Analysis</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Clear, data-first analysis without fluff. Optimized for dense desktop viewing and large-screen mobile.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric title="Accounts" value={String(accounts.length)} />
          <Metric title="Categories" value={String(categories.length)} />
          <Metric title="Current month spend" value={formatMoney(currentMonthExpenses)} />
          <Metric title="Expense days" value={String(dailySpend.size)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Category breakdown">
            <List rows={categoryRows.slice(0, 8).map((row) => ({ left: row.category, right: formatMoney(row.amount), sub: `${row.count} txns` }))} />
          </Panel>
          <Panel title="Weekday vs weekend">
            <List rows={weekdayRows.map((row) => ({ left: row.label, right: formatMoney(row.amount), sub: `${row.count} txns` }))} />
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Top repeated notes">
            <List rows={topNotes.length ? topNotes.map((row) => ({ left: row.note, right: formatMoney(row.amount), sub: `${row.count} times` })) : [{ left: 'No repeated notes yet', right: '', sub: 'Add more transactions to see patterns.' }]} />
          </Panel>
          <Panel title="Calendar intensity preview">
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-text-secondary">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => <div key={d}>{d}</div>)}
              {monthGrid.days.map((day) => (
                <a
                  key={day.key}
                  href={`/whathappened?date=${day.key}`}
                  className={`min-h-11 rounded-lg border p-2 transition ${day.inMonth ? 'border-border' : 'border-border/40 text-text-muted'} ${
                    day.spend > 0 ? 'bg-accent/10' : 'bg-bg-secondary'
                  }`}
                >
                  <div className="font-medium text-text-primary">{day.label}</div>
                  <div className="mt-1 font-mono text-[11px]">{day.spend ? formatMoney(day.spend) : '—'}</div>
                </a>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-bg-secondary p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
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

function List({ rows }: { rows: { left: string; right: string; sub?: string }[] }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.left} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-bg-primary/50 px-3 py-2">
          <div>
            <div className="font-medium">{row.left}</div>
            {row.sub ? <div className="text-xs text-text-secondary">{row.sub}</div> : null}
          </div>
          <div className="font-mono">{row.right}</div>
        </div>
      ))}
    </div>
  );
}
