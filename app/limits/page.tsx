import { AppShell } from '../../components/AppShell';
import { LimitsClient } from '../../components/LimitsClient';
import { getCategories, getLimits, getTags } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function LimitsPage() {
  const [limits, categories, tags] = await Promise.all([getLimits(), getCategories(), getTags()]);
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Limits</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Spending caps by category, tag, or overall.</p>
        </div>
        <LimitsClient initialLimits={limits} categories={categories} tags={tags} />
      </div>
    </AppShell>
  );
}
