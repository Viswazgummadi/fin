import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary lg:flex">
      <Sidebar />
      <div className="flex-1">
        <header className="border-b border-border bg-bg-secondary px-4 py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div>
              <div className="text-sm text-text-secondary">Personal Finance Journal</div>
              <div className="font-mono text-lg">₹0.00</div>
            </div>
            <div className="flex gap-2">
              <a className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm" href="/add">
                + Add
              </a>
              <a className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm" href="/login">
                Login
              </a>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </div>
    </div>
  );
}
