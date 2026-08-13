import { AppShell } from '../components/AppShell';

export default function Home() {
  return (
    <AppShell>
      <div className="rounded-xl border border-border bg-bg-secondary p-6">
        <h1 className="text-2xl font-semibold">Personal Finance Journal</h1>
        <p className="mt-2 text-text-secondary">
          Scaffold ready. Next stage: connect Supabase and protect routes.
        </p>
      </div>
    </AppShell>
  );
}
