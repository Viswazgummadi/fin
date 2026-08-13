import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { DashboardStats } from '../../components/DashboardStats';
import { getAccounts, getCategories, getTransactions } from '../../lib/data';
import { formatMoney, getRecentTransactions, summarizeCategories } from '../../lib/insights';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [accounts, categories, transactions] = await Promise.all([getAccounts(), getCategories(), getTransactions({ limit: 1000 })]);
  const recent = getRecentTransactions(transactions, 8);
  const topCategories = summarizeCategories(transactions, categories).slice(0, 5);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">A fast overview for daily use on desktop and a Samsung S25 Ultra.</p>
        </div>
        <DashboardStats accounts={accounts} transactions={transactions} />

        <div className="grid gap-4 xl:grid-cols-2">
          <Section title="Recent transactions" action={<Link href="/whathappened" className="text-sm text-accent">Open journal</Link>}>
            <div className="space-y-2">
              {recent.length ? recent.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary px-3 py-2">
                  <div>
                    <div className="font-medium">{txn.note || 'No note'}</div>
                    <div className="text-xs text-text-secondary">{new Date(txn.occurred_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div className="font-mono">{formatMoney(Number(txn.amount))}</div>
                </div>
              )) : <Empty text="No transactions yet. Add one from the Transactions page." />}
            </div>
          </Section>

          <Section title="Top categories" action={<Link href="/analysis" className="text-sm text-accent">Deep analysis</Link>}>
            <div className="space-y-2">
              {topCategories.length ? topCategories.map((row) => (
                <div key={row.category} className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary px-3 py-2">
                  <div>
                    <div className="font-medium">{row.category}</div>
                    <div className="text-xs text-text-secondary">{row.count} transactions</div>
                  </div>
                  <div className="font-mono">{formatMoney(row.amount)}</div>
                </div>
              )) : <Empty text="Add expenses with categories to see spending by category." />}
            </div>
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-bg-primary/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border p-4 text-sm text-text-secondary">{text}</div>;
}
