"use client";

import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

export function AuthButtons() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <button onClick={signOut} className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm">
      Logout
    </button>
  );
}
