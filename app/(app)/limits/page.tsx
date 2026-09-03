import { LimitsClient } from '../../../components/LimitsClient';
import { getCategories, getLimits, getTags, getTransactions } from '../../../lib/data';
import type { TransactionWithTags } from '../../../lib/analysis';
import { BackLink } from '../../../components/BackLink';

export const dynamic = 'force-dynamic';

const LIMITS_TXN_SELECT = 'id,type,amount,category_id,occurred_at,deleted_at,transaction_tags(tag_id,tags(id,name,color))';

export default async function LimitsPage() {
  const [limits, categories, tags, rawTransactions] = await Promise.all([
    getLimits(),
    getCategories(),
    getTags(),
    getTransactions({ limit: 3000, select: LIMITS_TXN_SELECT }),
  ]);

  const transactions = (rawTransactions as unknown as Array<Record<string, unknown>>).map((row) => ({
    ...row,
    tags: ((row.transaction_tags as { tags: { id: string; name: string; color: string | null } | null }[] | null) ?? [])
      .map((tt) => tt.tags)
      .filter((t): t is { id: string; name: string; color: string | null } => Boolean(t)),
  })) as unknown as TransactionWithTags[];

  return (
    <div className="space-y-6 fade-up">
      <div className="page-header">
        <BackLink href="/manage" label="Manage" />
        <h1 className="page-title">Limits</h1>
        <p className="page-copy">Spending caps by category, tag, or overall — tracked against the current period.</p>
      </div>
      <LimitsClient initialLimits={limits} categories={categories} tags={tags} transactions={transactions} />
    </div>
  );
}
