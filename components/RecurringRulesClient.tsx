"use client";

import { useState } from 'react';
import type { Account, Category, RecurringRule } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { formatMoney } from '../lib/insights';

export function RecurringRulesClient({ initialRules, accounts, categories }: { initialRules: RecurringRule[]; accounts: Account[]; categories: Category[] }) {
  const supabase = createSupabaseBrowserClient();
  const [rules, setRules] = useState(initialRules);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [type, setType] = useState<RecurringRule['type']>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [frequency, setFrequency] = useState<RecurringRule['frequency']>('monthly');
  const [intervalCount, setIntervalCount] = useState('1');
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [weekday, setWeekday] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [nextRunDate, setNextRunDate] = useState(new Date().toISOString().slice(0, 10));

  const save = async () => {
    if (!supabase || !accountId || !amount) return;
    const payload = {
      account_id: accountId,
      category_id: type === 'transfer' ? null : categoryId || null,
      type,
      amount,
      note: note || null,
      frequency,
      interval_count: Number(intervalCount || 1),
      day_of_month: dayOfMonth ? Number(dayOfMonth) : null,
      weekday: weekday ? Number(weekday) : null,
      start_date: startDate,
      end_date: null,
      next_run_date: nextRunDate,
      active: true,
    };
    const { data, error } = await supabase.from('recurring_rules').insert(payload).select('*').single();
    if (!error && data) setRules([data, ...rules]);
    setAmount('');
    setNote('');
  };

  const disable = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('recurring_rules').update({ active: false }).eq('id', id);
    if (!error) setRules(rules.filter((rule) => rule.id !== id));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <section className="space-y-3 rounded-xl border border-border bg-bg-secondary p-4">
        <div className="font-semibold">Recurring rules</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <select className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          <select className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={type} onChange={(e) => setType(e.target.value as RecurringRule['type'])}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
          <select className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">No category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringRule['frequency'])}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Interval" inputMode="numeric" value={intervalCount} onChange={(e) => setIntervalCount(e.target.value)} />
          <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Day of month" inputMode="numeric" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
          <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Weekday (0-6)" inputMode="numeric" value={weekday} onChange={(e) => setWeekday(e.target.value)} />
          <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" type="date" value={nextRunDate} onChange={(e) => setNextRunDate(e.target.value)} />
          <textarea className="min-h-24 rounded-lg border border-border bg-bg-tertiary px-3 py-2 md:col-span-2 xl:col-span-3" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button onClick={save} className="min-h-11 rounded-lg bg-accent px-4 py-2 font-medium text-black">Add recurring rule</button>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-bg-secondary p-4">
        <div className="font-semibold">Active rules</div>
        {rules.length ? rules.map((rule) => (
          <div key={rule.id} className="rounded-xl border border-border bg-bg-primary/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{rule.type} · {rule.frequency}</div>
                <div className="text-sm text-text-secondary">{rule.note ?? 'No note'}</div>
                <div className="text-xs text-text-muted">Next run {rule.next_run_date}</div>
              </div>
              <div className="flex gap-2">
                <div className="font-mono">{formatMoney(Number(rule.amount))}</div>
                <button onClick={() => disable(rule.id)} className="rounded-lg border border-border px-3 py-1 text-sm">Disable</button>
              </div>
            </div>
          </div>
        )) : <div className="rounded-lg border border-dashed border-border p-4 text-sm text-text-secondary">No recurring rules yet.</div>}
      </section>
    </div>
  );
}
