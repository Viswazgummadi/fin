import { CrudPage } from '../../../components/CrudPage';
import { CategoriesClient } from '../../../components/CategoriesClient';
import { getCategories } from '../../../lib/data';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <CrudPage
      title="Categories"
      description="Expense/income/both categories with subcategories, icons, colors, and essential flagging."
      rows={[]}
      backHref="/manage"
      backLabel="Manage"
    >
      <CategoriesClient initialCategories={categories} />
    </CrudPage>
  );
}
