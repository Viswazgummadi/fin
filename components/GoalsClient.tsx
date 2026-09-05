"use client";

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Account, Goal } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { formatMoney } from '../lib/insights';
import { queryKeys } from '../lib/query-keys';
import { RadialProgress } from './charts/RadialProgress';

function goalRatio(goal: Goal) {
  return Number(goal.target_amount) > 0 ? Number(goal.current_amount) / Number(goal.target_amount) : 0;
}

function etaMonths(goal?: Goal) {
  if (!goal) return '—';
  const remaining = Math.max(0, Number(goal.target_amount || 0) - Number(goal.current_amount || 0));
  const monthly = Number(goal.monthly_contribution || 0);
  if (!monthly) return '—';
  return `${Math.ceil(remaining / monthly)} mo`;
}

export function GoalsClient({ initialGoals, accounts }: { initialGoals: Goal[]; accounts: Account[] }) {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();
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
      if (!error && data) {
        setGoals(goals.map((g) => (g.id === editingId ? data : g)));
        queryClient.invalidateQueries({ queryKey: queryKeys.goals });
      }
      reset();
      return;
    }
    const { data, error } = await supabase.from('goals').insert(payload).select('*').single();
    if (!error && data) {
      setGoals([data, ...goals]);
      setSelectedGoalId(data.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.goals });
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
    if (!error) {
      setGoals(goals.filter((g) => g.id !== id));
      queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    }
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
      if (!goalError && data) {
        setGoals(goals.map((g) => (g.id === selectedGoalId ? data : g)));
        queryClient.invalidateQueries({ queryKey: queryKeys.goals });
      }
    }
    setContributionAmount('');
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <section className="surface-card space-y-4 p-4">
        <div>
          <div className="kicker">Savings</div>
          <div className="mt-1 font-medium">{editingId ? 'Edit goal' : 'Add goal'}</div>
        </div>
        <div className="space-y-3">
          <input className="field" placeholder="Goal name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid gap-3 md:grid-cols-2">
            <input className="field" placeholder="Target amount" inputMode="decimal" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
            <input className="field" placeholder="Current amount" inputMode="decimal" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="field" placeholder="Monthly contribution" inputMode="decimal" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} />
            <input className="field" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <select className="field" value={linkedAccountId} onChange={(e) => setLinkedAccountId(e.target.value)}>
            <option value="">No linked account</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          <button onClick={saveGoal} className="btn-primary w-full">{editingId ? 'Update' : 'Add'} goal</button>
          {editingId ? <button onClick={reset} className="btn-ghost w-full text-sm">Cancel edit</button> : null}
        </div>

        <div className="space-y-2 border-t border-[--hairline] pt-4">
          {goals.length ? goals.map((goal) => {
            const active = selectedGoalId === goal.id;
            return (
              <div
                key={goal.id}
                onClick={() => setSelectedGoalId(goal.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedGoalId(goal.id)}
                className={`data-row flex cursor-pointer items-center gap-3 px-3 py-2.5 ${active ? 'border-[--accent-2] bg-[--accent-wash]' : ''}`}
              >
                <RadialProgress value={goalRatio(goal)} size={44} thickness={5} color="var(--accent-2)" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{goal.name}</div>
                  <div className="text-xs text-[--text-secondary]">{formatMoney(Number(goal.current_amount))} / {formatMoney(Number(goal.target_amount))}</div>
                  <div className="text-xs text-[--text-muted]">ETA {etaMonths(goal)}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <button onClick={(e) => { e.stopPropagation(); editGoal(goal); }} className="btn-ghost px-2 py-1 text-xs">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); archiveGoal(goal.id); }} className="btn-ghost px-2 py-1 text-xs">Archive</button>
                </div>
              </div>
            );
          }) : <EmptyState text="No goals yet." />}
        </div>
      </section>

      <section className="surface-card space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="kicker">Progress</div>
            <div className="mt-1 font-medium">Goal detail</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <select className="field" value={selectedGoalId} onChange={(e) => setSelectedGoalId(e.target.value)}>
            {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input className="field" placeholder="Contribution" inputMode="decimal" value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} />
            <button onClick={addContribution} className="btn-primary">Add</button>
          </div>
        </div>

        {selectedGoal ? (
          <div className="surface-soft flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
            <RadialProgress
              value={goalRatio(selectedGoal)}
              size={140}
              thickness={14}
              color="var(--accent-2)"
              label={`${Math.round(goalRatio(selectedGoal) * 100)}%`}
              sublabel="funded"
            />
            <div className="flex-1 space-y-1">
              <div className="text-lg font-medium">{selectedGoal.name}</div>
              <div className="font-mono text-sm text-[--text-secondary]">
                {formatMoney(Number(selectedGoal.current_amount))} of {formatMoney(Number(selectedGoal.target_amount))}
              </div>
              <div className="text-sm text-[--text-muted]">ETA {etaMonths(selectedGoal)}</div>
              {selectedGoal.target_date ? <div className="text-sm text-[--text-muted]">Target date {selectedGoal.target_date}</div> : null}
            </div>
          </div>
        ) : (
          <EmptyState text="No goals yet." />
        )}
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[--radius-sm] border border-dashed border-[--hairline] p-6 text-center text-sm text-[--text-muted]">{text}</div>;
}
