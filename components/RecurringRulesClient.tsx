"use client";

import { useState } from 'react';
import { Repeat } from 'lucide-react';
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

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

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
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
      <section className="surface-card space-y-4 p-4">
        <div>
          <div className="kicker">Automation</div>
          <div className="mt-1 font-medium">Add recurring rule</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <select className="field" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          <select className="field" value={type} onChange={(e) => setType(e.target.value as RecurringRule['type'])}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
          <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">No category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <input className="field" placeholder="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select className="field" value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringRule['frequency'])}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input className="field" placeholder="Interval" inputMode="numeric" value={intervalCount} onChange={(e) => setIntervalCount(e.target.value)} />
          <input className="field" placeholder="Day of month" inputMode="numeric" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
          <input className="field" placeholder="Weekday (0-6)" inputMode="numeric" value={weekday} onChange={(e) => setWeekday(e.target.value)} />
          <input className="field" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input className="field" type="date" value={nextRunDate} onChange={(e) => setNextRunDate(e.target.value)} />
          <textarea className="field md:col-span-2 xl:col-span-3" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button onClick={save} className="btn-primary">Add recurring rule</button>
      </section>

      <section className="surface-card p-4">
        <div className="mb-3">
          <div className="kicker">Schedule</div>
          <div className="mt-1 font-medium">Active rules</div>
        </div>
        {rules.length ? (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="data-row flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Repeat size={16} className="shrink-0 text-[--accent-2]" />
                  <div className="min-w-0">
                    <div className="truncate font-medium capitalize">{rule.type} &middot; every {rule.interval_count > 1 ? `${rule.interval_count} ` : ''}{rule.frequency}</div>
                    <div className="truncate text-sm text-[--text-secondary]">
                      {accountMap.get(rule.account_id) ?? 'Unknown account'}
                      {rule.category_id ? ` · ${categoryMap.get(rule.category_id) ?? 'Unknown category'}` : ''}
                    </div>
                    <div className="text-xs text-[--text-muted]">{rule.note ?? 'No note'} · next {rule.next_run_date}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="font-mono text-sm">{formatMoney(Number(rule.amount))}</div>
                  <button onClick={() => disable(rule.id)} className="btn-ghost px-2 py-1 text-xs">Disable</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="No recurring rules yet." />
        )}
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[--radius-sm] border border-dashed border-[--hairline] p-6 text-center text-sm text-[--text-muted]">{text}</div>;
}
