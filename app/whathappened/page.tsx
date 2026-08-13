import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { getAccounts, getCategories, getTransactions } from '../../lib/data';
import { formatMoney, summarizeDailyTransactions, toDateKey } from '../../lib/insights';

export const dynamic = 'force-dynamic';

function addDays(dateKey: string, days: number) {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export default async function WhatHappenedPage({ searchParams }: { searchParams?: { date?: string } }) {
  const [accounts, categories, transactions] = await Promise.all([getAccounts(), getCategories(), getTransactions({ limit: 2000 })]);
  const todayKey = toDateKey(new Date());
  const selectedDate = searchParams?.date || todayKey;
  const { list, income, spent, transferred } = summarizeDailyTransactions(transactions, selectedDate);
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">What happened?</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">A daily journal view for the chosen date. Built for quick review on mobile and desktop.</p>
        </div>

        <form className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-bg-secondary p-4" method="get">
          <label className="space-y-1 text-sm text-text-secondary">
            Date
            <input
              type="date"
              name="date"
              defaultValue={selectedDate}
              className="block rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-text-primary"
            />
          </label>
          <button className="rounded-lg bg-accent px-4 py-2 font-medium text-black">Open</button>
          <div className="ml-auto flex gap-2">
            <Link className="rounded-lg border border-border px-3 py-2 text-sm" href={`/whathappened?date=${addDays(selectedDate, -1)}`}>
              Prev day
            </Link>
            <Link className="rounded-lg border border-border px-3 py-2 text-sm" href={`/whathappened?date=${addDays(selectedDate, 1)}`}>
              Next day
            </Link>
          </div>
        </form>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric title="Income" value={formatMoney(income)} />
          <Metric title="Spent" value={formatMoney(spent)} />
          <Metric title="Transferred" value={formatMoney(transferred)} />
          <Metric title="Transactions" value={String(list.length)} />
        </div>

        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <div className="mb-3 text-sm text-text-secondary">Transactions for {selectedDate}</div>
          <div className="space-y-2">
            {list.length ? list.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-bg-primary/60 p-3">
                <div>
                  <div className="font-medium">{txn.note || 'No note'}</div>
                  <div className="text-sm text-text-secondary">
                    {accountMap.get(txn.account_id) ?? 'Unknown account'}
                    {txn.category_id ? ` · ${categoryMap.get(txn.category_id) ?? 'Unknown category'}` : ''}
                  </div>
                </div>
                <div className="font-mono">{formatMoney(Number(txn.amount))}</div>
              </div>
            )) : <div className="rounded-lg border border-dashed border-border p-4 text-sm text-text-secondary">No transactions on this day.</div>}
          </div>
        </div>
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
