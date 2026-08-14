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
    <button onClick={signOut} className="btn-secondary text-sm">
      Logout
    </button>
  );
}
