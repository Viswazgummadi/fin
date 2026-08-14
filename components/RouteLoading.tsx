import { AppShell } from './AppShell';

export function RouteLoading({ title }: { title: string }) {
  return (
    <AppShell>
      <div className="space-y-6 animate-pulse">
        <div className="page-header">
          <div className="h-9 w-44 rounded-full bg-white/10" />
          <div className="h-4 max-w-2xl rounded-full bg-white/5" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="surface-card h-24 p-4">
              <div className="h-3 w-20 rounded-full bg-white/10" />
              <div className="mt-4 h-7 w-28 rounded-full bg-white/5" />
              <div className="mt-3 h-3 w-24 rounded-full bg-white/10" />
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="surface-card h-72 p-4">
            <div className="h-4 w-32 rounded-full bg-white/10" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-12 rounded-[--radius] bg-white/5" />
              ))}
            </div>
          </div>
          <div className="surface-card h-72 p-4">
            <div className="h-4 w-32 rounded-full bg-white/10" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-12 rounded-[--radius] bg-white/5" />
              ))}
            </div>
          </div>
        </div>

        <div className="sr-only">Loading {title}</div>
      </div>
    </AppShell>
  );
}
