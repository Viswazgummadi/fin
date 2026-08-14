import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { OnlineStatus } from './OnlineStatus';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[--bg-primary]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-thin bg-[--bg-primary]/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto w-full">
            <h1 className="text-sm font-medium tracking-wide">Finance Journal</h1>
            <div className="flex items-center gap-3">
              <OnlineStatus />
              <Link href="/add" className="px-3 py-1.5 bg-[--accent] text-[--bg-primary] text-sm font-semibold rounded-[--radius] hover:opacity-90">
                + Add
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 mx-auto w-full max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  );
}
