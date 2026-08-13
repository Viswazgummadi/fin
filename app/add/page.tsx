import { AppShell } from '../../components/AppShell';
import { SectionPage } from '../../components/SectionPage';

export default function AddPage() {
  return (
    <AppShell>
      <SectionPage
        title="Quick Add"
        description="Fast manual entry with keypad-first flow, recent categories, notes, tags, and offline queue support in later stages."
        items={[
          { title: 'Amount keypad', description: 'Big mono number input designed for under-10-second entry.' },
          { title: 'Type toggle', description: 'Expense, income, and transfer modes with remembered last choice.' },
          { title: 'Smart categories', description: 'Recent categories first, then the full category picker.' },
        ]}
      />
    </AppShell>
  );
}
