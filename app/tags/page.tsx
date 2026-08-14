import { AppShell } from '../../components/AppShell';
import { TagsClient } from '../../components/TagsClient';
import { getTags } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function TagsPage() {
  const tags = await getTags();
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Tags</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Create labels for faster filtering and limit scoping.</p>
        </div>
        <TagsClient initialTags={tags} />
      </div>
    </AppShell>
  );
}
