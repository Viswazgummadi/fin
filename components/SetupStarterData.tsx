"use client";

import { useState } from 'react';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

export function SetupStarterData() {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const seed = async () => {
    if (!supabase) return;
    setLoading(true);
    setMessage('');

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setMessage('Please log in first.');
      setLoading(false);
      return;
    }

    const { data: account } = await supabase
      .from('accounts')
      .insert({ name: 'Main account', type: 'bank', opening_balance: 0, currency: 'INR' })
      .select('*')
      .single();

    const { data: category } = await supabase
      .from('categories')
      .insert({ name: 'General', kind: 'expense' })
      .select('*')
      .single();

    if (account && category) {
      setMessage('Starter account and category created. You can now add transactions.');
      window.location.reload();
    } else {
      setMessage('Could not create starter data. Check Supabase permissions.');
    }
    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <div className="font-medium">Need starter data?</div>
      <p className="mt-1 text-sm text-text-secondary">Create one account and one category so you can test transactions immediately.</p>
      <button onClick={seed} disabled={loading} className="mt-3 rounded-lg bg-accent px-4 py-2 font-medium text-black">
        {loading ? 'Creating...' : 'Create starter data'}
      </button>
      {message ? <p className="mt-2 text-sm text-text-secondary">{message}</p> : null}
    </div>
  );
}
