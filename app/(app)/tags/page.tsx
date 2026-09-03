import { TagsClient } from '../../../components/TagsClient';
import { getTags } from '../../../lib/data';
import { BackLink } from '../../../components/BackLink';

export const dynamic = 'force-dynamic';

export default async function TagsPage() {
  const tags = await getTags();
  return (
    <div className="space-y-6 fade-up">
      <div className="page-header">
        <BackLink href="/manage" label="Manage" />
        <h1 className="page-title">Tags</h1>
        <p className="page-copy">Labels for filtering, tagging transactions, and limits.</p>
      </div>
      <TagsClient initialTags={tags} />
    </div>
  );
}
