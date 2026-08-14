import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { AuthButtons } from './AuthButtons';
import { MobileBottomNav } from './MobileBottomNav';
import { OnlineStatus } from './OnlineStatus';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-bg-primary text-text-primary lg:flex">
      <Sidebar />
      <div className="flex-1 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-border bg-bg-secondary/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-bg-secondary/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div>
              <Link href="/dashboard" className="block text-sm text-text-secondary hover:text-text-primary">
                Personal Finance Journal
              </Link>
              <div className="text-xs text-text-muted">Private, single-user, manual entry</div>
            </div>
            <div className="flex items-center gap-2">
              <Link className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm min-h-11 inline-flex items-center" href="/add">
                + Add
              </Link>
              <OnlineStatus />
              <AuthButtons />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
