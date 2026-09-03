import { cookies } from 'next/headers';
import { Sidebar } from './Sidebar';
import { AppHeader } from './AppHeader';
import { MobileDock } from './MobileDock';
import { CommandPalette } from './CommandPalette';
import { PageTransition } from './PageTransition';
import { SyncManager } from './SyncManager';

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = cookies().get('fin.sidebar.collapsed')?.value === 'true';

  return (
    <div className="relative flex min-h-screen">
      <SyncManager />
      <CommandPalette />
      <Sidebar initialCollapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-28 pt-4 sm:px-4 md:px-6 lg:pb-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileDock />
    </div>
  );
}
