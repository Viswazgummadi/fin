import { LoginForm } from '../../components/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-6 py-10 text-text-primary">
      <div className="mx-auto max-w-md rounded-xl border border-border bg-bg-secondary p-6">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Sign in with the single allowed email for this private app.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
