import Link from 'next/link';
import { cookies } from 'next/headers';
import { Sidebar } from './Sidebar';
import { HeaderActions } from './HeaderActions';

import { SyncManager } from './SyncManager';

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = cookies().get('fin.sidebar.collapsed')?.value === 'true';

  return (
    <div className="flex min-h-screen bg-[--bg-primary] text-[--text-primary]">
      <SyncManager />
      <Sidebar initialCollapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[--border] bg-[--bg-primary]/90 px-3 py-3 backdrop-blur-sm sm:px-4 lg:px-6">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
            <Link href="/" className="min-w-0">
              <div className="truncate text-sm font-medium tracking-wide">Calm Ledger</div>
              <div className="truncate text-xs text-[--text-muted]">Private finance</div>
            </Link>
            <HeaderActions />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-4 pt-2 sm:px-4 md:px-6 md:pb-6 md:pt-3">{children}</main>
      </div>
    </div>
  );
}
