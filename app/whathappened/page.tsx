import { AppShell } from '../../components/AppShell';
import { WhatHappenedClient } from '../../components/WhatHappenedClient';
import { toDateKey } from '../../lib/insights';

export default function WhatHappenedPage({ searchParams }: { searchParams?: { date?: string } }) {
  const selectedDate = searchParams?.date || toDateKey(new Date());

  return (
    <AppShell>
      <WhatHappenedClient selectedDate={selectedDate} />
    </AppShell>
  );
}
