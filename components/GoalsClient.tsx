"use client";

import { useState } from 'react';
import type { Account, Goal } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { formatMoney } from '../lib/insights';

export function GoalsClient({ initialGoals, accounts }: { initialGoals: Goal[]; accounts: Account[] }) {
  const supabase = createSupabaseBrowserClient();
  const [goals, setGoals] = useState(initialGoals);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState(accounts[0]?.id ?? '');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState(initialGoals[0]?.id ?? '');
  const [contributionAmount, setContributionAmount] = useState('');

  const selectedGoal = goals.find((g) => g.id === selectedGoalId) ?? goals[0];
  const reset = () => {
    setEditingId(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setMonthlyContribution('');
    setTargetDate('');
    setLinkedAccountId(accounts[0]?.id ?? '');
  };

  const saveGoal = async () => {
    if (!supabase || !name.trim() || !targetAmount) return;
    const payload = {
      name,
      target_amount: targetAmount,
      current_amount: currentAmount || '0',
      monthly_contribution: monthlyContribution || null,
      target_date: targetDate || null,
      linked_account_id: linkedAccountId || null,
    };
    if (editingId) {
      const { data, error } = await supabase.from('goals').update(payload).eq('id', editingId).select('*').single();
      if (!error && data) setGoals(goals.map((g) => (g.id === editingId ? data : g)));
      reset();
      return;
    }
    const { data, error } = await supabase.from('goals').insert(payload).select('*').single();
    if (!error && data) {
      setGoals([data, ...goals]);
      setSelectedGoalId(data.id);
    }
    reset();
  };

  const editGoal = (goal: Goal) => {
    setEditingId(goal.id);
    setName(goal.name);
    setTargetAmount(goal.target_amount);
    setCurrentAmount(goal.current_amount);
    setMonthlyContribution(goal.monthly_contribution ?? '');
    setTargetDate(goal.target_date ?? '');
    setLinkedAccountId(goal.linked_account_id ?? '');
  };

  const archiveGoal = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('goals').update({ archived: true }).eq('id', id);
    if (!error) setGoals(goals.filter((g) => g.id !== id));
  };

  const addContribution = async () => {
    if (!supabase || !selectedGoalId || !contributionAmount) return;
    const goal = goals.find((g) => g.id === selectedGoalId);
    if (!goal) return;
    const nextCurrent = Number(goal.current_amount || 0) + Number(contributionAmount || 0);
    const { error } = await supabase.from('goal_contributions').insert({ goal_id: selectedGoalId, amount: contributionAmount });
    if (!error) {
      const { error: goalError, data } = await supabase
        .from('goals')
        .update({ current_amount: String(nextCurrent) })
        .eq('id', selectedGoalId)
        .select('*')
        .single();
      if (!goalError && data) setGoals(goals.map((g) => (g.id === selectedGoalId ? data : g)));
    }
    setContributionAmount('');
  };

  const etaMonths = (goal?: Goal) => {
    if (!goal) return '—';
    const remaining = Math.max(0, Number(goal.target_amount || 0) - Number(goal.current_amount || 0));
    const monthly = Number(goal.monthly_contribution || 0);
    if (!monthly) return '—';
    return `${Math.ceil(remaining / monthly)} mo`;
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <section className="space-y-4 rounded-xl border border-border bg-bg-secondary p-4">
        <div className="font-semibold">Goals</div>
        <div className="space-y-3">
          <input className="min-h-11 w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Goal name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid gap-3 md:grid-cols-2">
            <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Target amount" inputMode="decimal" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
            <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Current amount" inputMode="decimal" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Monthly contribution" inputMode="decimal" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} />
            <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <select className="min-h-11 w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={linkedAccountId} onChange={(e) => setLinkedAccountId(e.target.value)}>
            <option value="">No linked account</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          <button onClick={saveGoal} className="min-h-11 w-full rounded-lg bg-accent px-4 py-2 font-medium text-black">{editingId ? 'Update' : 'Add'} goal</button>
          {editingId ? <button onClick={reset} className="text-sm text-text-secondary">Cancel edit</button> : null}
        </div>
        <div className="space-y-2">
          {goals.map((goal) => (
            <div
              key={goal.id}
              onClick={() => setSelectedGoalId(goal.id)}
              className={`cursor-pointer rounded-xl border p-3 ${selectedGoalId === goal.id ? 'border-accent bg-accent/10' : 'border-border bg-bg-primary/40'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{goal.name}</div>
                  <div className="text-sm text-text-secondary">{formatMoney(Number(goal.current_amount))} / {formatMoney(Number(goal.target_amount))}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); editGoal(goal); }} className="text-xs text-text-secondary">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); archiveGoal(goal.id); }} className="text-xs text-text-secondary">Archive</button>
                </div>
              </div>
              <div className="mt-2 text-xs text-text-muted">ETA {etaMonths(goal)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-bg-secondary p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Goal detail</div>
            <div className="text-sm text-text-secondary">Add contributions and track progress.</div>
          </div>
          <div className="font-mono">{selectedGoal ? `${Math.round((Number(selectedGoal.current_amount || 0) / Math.max(1, Number(selectedGoal.target_amount || 0))) * 100)}%` : '0%'}</div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <select className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={selectedGoalId} onChange={(e) => setSelectedGoalId(e.target.value)}>
            {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Contribution" inputMode="decimal" value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} />
            <button onClick={addContribution} className="min-h-11 rounded-lg bg-accent px-4 py-2 font-medium text-black">Add</button>
          </div>
        </div>

        {selectedGoal ? (
          <div className="space-y-3 rounded-xl border border-border bg-bg-primary/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{selectedGoal.name}</div>
                <div className="text-sm text-text-secondary">{formatMoney(Number(selectedGoal.current_amount))} / {formatMoney(Number(selectedGoal.target_amount))}</div>
              </div>
              <div className="font-mono">ETA {etaMonths(selectedGoal)}</div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-bg-tertiary">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, (Number(selectedGoal.current_amount || 0) / Math.max(1, Number(selectedGoal.target_amount || 0))) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-text-secondary">No goals yet.</div>
        )}
      </section>
    </div>
  );
}
