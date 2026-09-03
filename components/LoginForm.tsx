"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!supabase) {
      setLoading(false);
      setError('Supabase env vars are missing in this environment.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push('/');
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <input className="field" placeholder="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        className="field"
        placeholder="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <p className="text-sm text-[--danger]">{error}</p> : null}
      <button disabled={loading} className="btn-primary w-full">
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
