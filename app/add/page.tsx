import { AppShell } from '../../components/AppShell';
import { QuickAdd } from '../../components/QuickAdd';

export default function AddPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-3xl font-semibold">Quick Add</h1>
        <QuickAdd />
      </div>
    </AppShell>
  );
}
