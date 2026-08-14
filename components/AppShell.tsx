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
        <header className="glass-nav sticky top-4 z-30 mx-4 my-2 border border-[--border] px-4 py-3">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
            <Link href="/" className="min-w-0">
              <div className="truncate text-sm font-medium tracking-wide">Finance Journal</div>
              <div className="truncate text-xs text-[--text-muted]">Private, calm, fast</div>
            </Link>
            <HeaderActions />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
