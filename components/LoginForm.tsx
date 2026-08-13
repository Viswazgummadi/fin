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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push('/');
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <input className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 outline-none" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 outline-none" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button disabled={loading} className="rounded-lg bg-accent px-4 py-2 font-medium text-black">
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
