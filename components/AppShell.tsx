import Link from 'next/link';
import { cookies } from 'next/headers';
import { Sidebar } from './Sidebar';
import { HeaderActions } from './HeaderActions';
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
        <header className="sticky top-3 z-30 mx-3 sm:mx-4 lg:mx-6">
          <div className="glass-2 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
            <Link href="/" className="min-w-0 lg:hidden">
              <div className="truncate font-mono text-sm font-medium tracking-wide text-[--text-primary]">Calm Ledger</div>
            </Link>
            <div className="ml-auto">
              <HeaderActions />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-28 pt-4 sm:px-4 md:px-6 lg:pb-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileDock />
    </div>
  );
}
