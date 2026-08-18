"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '../utils/supabase/client';

export function SetupStarterData() {
  const router = useRouter();
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

    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', 'Main account')
      .maybeSingle();

    const { data: existingCategory } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', 'General')
      .maybeSingle();

    let createdAccount = existingAccount;
    let createdCategory = existingCategory;

    if (!createdAccount) {
      const { data, error } = await supabase
        .from('accounts')
        .insert({ name: 'Main account', type: 'bank', opening_balance: 0, currency: 'INR' })
        .select('*')
        .single();
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      createdAccount = data;
    }

    const { data: secondAccount, error: secondAccountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', 'Cash wallet')
      .maybeSingle();

    if (!secondAccount && !secondAccountError) {
      const { error } = await supabase
        .from('accounts')
        .insert({ name: 'Cash wallet', type: 'cash', opening_balance: 0, currency: 'INR' })
        .select('*')
        .single();
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
    }

    if (!createdCategory) {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name: 'General', kind: 'expense' })
        .select('*')
        .single();
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      createdCategory = data;
    }

    if (createdAccount && createdCategory) {
      setMessage('Starter data created.');
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <div className="font-medium">Starter data</div>
      <p className="mt-1 text-sm text-text-secondary">Create a default account and category.</p>
      <button onClick={seed} disabled={loading} className="mt-3 rounded-lg bg-accent px-4 py-2 font-medium text-black">
        {loading ? 'Creating...' : 'Create starter data'}
      </button>
      {message ? <p className="mt-2 text-sm text-text-secondary">{message}</p> : null}
    </div>
  );
}
