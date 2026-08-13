import { AppShell } from '../../components/AppShell';
import { SectionPage } from '../../components/SectionPage';

export default function CategoriesPage() {
  return (
    <AppShell>
      <SectionPage
        title="Categories"
        description="Expense/income/both categories with subcategories, icons, colors, and essential flagging."
        items={[
          { title: 'Hierarchy', description: 'Parent/child category support.' },
          { title: 'Essential flag', description: 'Use later in analysis for essential vs optional spending.' },
          { title: 'Tags', description: 'Create-on-the-fly labels for better search and breakdowns.' },
        ]}
      />
    </AppShell>
  );
}
