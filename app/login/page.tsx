import { LoginForm } from '../../components/LoginForm';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="glass-2 w-full max-w-md p-7 fade-up">
        <div className="kicker">Private finance</div>
        <h1 className="mt-2 bg-gradient-to-r from-[--text-primary] to-[--accent] bg-clip-text font-mono text-2xl text-transparent">
          Calm Ledger
        </h1>
        <p className="mt-2 text-sm text-[--text-secondary]">Sign in with your private account.</p>
        <LoginForm />
      </div>
    </main>
  );
}
