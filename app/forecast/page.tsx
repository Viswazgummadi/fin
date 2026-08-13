import { AppShell } from '../../components/AppShell';
import { getAccounts, getTransactions } from '../../lib/data';
import { calculateProjection, formatMoney } from '../../lib/insights';

export const dynamic = 'force-dynamic';

export default async function ForecastPage() {
  const [accounts, transactions] = await Promise.all([getAccounts(), getTransactions({ limit: 2000 })]);
  const projection = calculateProjection(accounts, transactions);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Forecast</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Simple forward-looking balance estimate using your current balance and recent net pace.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric title="Current balance" value={formatMoney(projection.balance)} />
          <Metric title="30d projection" value={formatMoney(projection.projected30)} />
          <Metric title="60d projection" value={formatMoney(projection.projected60)} />
          <Metric title="90d projection" value={formatMoney(projection.projected90)} />
        </div>

        <section className="rounded-xl border border-border bg-bg-secondary p-4">
          <h2 className="font-semibold">Formula</h2>
          <div className="mt-3 space-y-2 font-mono text-sm text-text-secondary">
            <div>Current balance: {formatMoney(projection.balance)}</div>
            <div>30-day net pace: {formatMoney(projection.net30)}</div>
            <div>Projected balance is based on your last 30 days of net flow.</div>
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
