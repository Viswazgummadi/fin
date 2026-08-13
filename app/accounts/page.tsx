import { AppShell } from '../../components/AppShell';
import { SectionPage } from '../../components/SectionPage';

export default function AccountsPage() {
  return (
    <AppShell>
      <SectionPage
        title="Accounts"
        description="Bank, cash, wallet, credit, and other accounts with opening balances and archive support."
        items={[
          { title: 'Balance', description: 'Computed from opening balance plus all account transactions.' },
          { title: 'Transfer', description: 'Move money between accounts as a special transaction type.' },
          { title: 'Archive', description: 'Hide inactive accounts without deleting history.' },
        ]}
      />
    </AppShell>
  );
}
