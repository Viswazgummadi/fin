import { AppShell } from '../../components/AppShell';
import { SectionPage } from '../../components/SectionPage';

export default function TransactionsPage() {
  return (
    <AppShell>
      <SectionPage
        title="Transactions"
        description="Filterable transaction list with edit, soft delete, undo, search, and shareable query params."
        items={[
          { title: 'Filters', description: 'Date range, account, category, tag, type, planned/unplanned, and amount range.' },
          { title: 'Undo history', description: 'Soft-deleted items remain restorable from history.' },
          { title: 'Duplicate', description: 'Repeat a past transaction into a new quick-add flow.' },
        ]}
      />
    </AppShell>
  );
}
