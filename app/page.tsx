import { AppShell } from '../components/AppShell';
import { createSupabaseServerClient } from '../utils/supabase/server';

export default async function Home() {
  const supabase = createSupabaseServerClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <AppShell>
      <div className="rounded-xl border border-border bg-bg-secondary p-6">
        <h1 className="text-2xl font-semibold">Personal Finance Journal</h1>
        <p className="mt-2 text-text-secondary">
          {data.user ? `Signed in as ${data.user.email}` : 'Supabase env not set on this environment yet.'}
        </p>
      </div>
    </AppShell>
  );
}
