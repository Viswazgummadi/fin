import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { HeaderActions } from './HeaderActions';

import { SyncManager } from './SyncManager';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[--bg-primary] text-[--text-primary]">
      <SyncManager />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="glass-nav sticky top-2 z-30 mx-3 mb-2 mt-3 border border-[--border] px-3 py-3 sm:top-3 sm:mx-4 sm:px-4 lg:mx-4 lg:mr-6 lg:mt-4">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
            <Link href="/" className="min-w-0">
              <div className="truncate text-sm font-medium tracking-wide">Finance Journal</div>
              <div className="truncate text-xs text-[--text-muted]">Private, calm, fast</div>
            </Link>
            <HeaderActions />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-4 pt-2 sm:px-4 md:px-6 md:pb-6 md:pt-3">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
