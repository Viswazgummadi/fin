import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { HeaderActions } from './HeaderActions';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[--bg-primary] text-[--text-primary]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-[--border] bg-[--bg-primary]/90 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/dashboard" className="min-w-0">
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
