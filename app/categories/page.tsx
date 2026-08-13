import { AppShell } from '../../components/AppShell';
import { CrudPage } from '../../components/CrudPage';
import { CategoriesClient } from '../../components/CategoriesClient';
import { getCategories } from '../../lib/data';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <AppShell>
      <CrudPage title="Categories" description="Expense/income/both categories with subcategories, icons, colors, and essential flagging." rows={[]}>
        <CategoriesClient initialCategories={categories} />
      </CrudPage>
    </AppShell>
  );
}
