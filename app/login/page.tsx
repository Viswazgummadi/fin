export default function LoginPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-6 py-10 text-text-primary">
      <div className="mx-auto max-w-md rounded-xl border border-border bg-bg-secondary p-6">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Supabase login will be connected after you create the project and share the env values.
        </p>
        <div className="mt-6 rounded-xl border border-dashed border-border bg-bg-tertiary p-4 text-sm text-text-muted">
          Manual step later: create Supabase project + add env vars.
        </div>
      </div>
    </main>
  );
}
