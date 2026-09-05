"use client";

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Person, PersonLedger } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { formatMoney } from '../lib/insights';
import { queryKeys } from '../lib/query-keys';

const ledgerTypes = ['lent', 'borrowed', 'shared_expense', 'reimbursement', 'settlement'] as const;

const AVATAR_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];

export function PeopleClient({ initialPeople, initialLedger }: { initialPeople: Person[]; initialLedger: PersonLedger[] }) {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();
  const [people, setPeople] = useState(initialPeople);
  const [ledger, setLedger] = useState(initialLedger);
  const [name, setName] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState(initialPeople[0]?.id ?? '');
  const [entryType, setEntryType] = useState<PersonLedger['type']>('lent');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const selectedPerson = people.find((p) => p.id === selectedPersonId) ?? null;
  const selectedLedger = useMemo(() => ledger.filter((row) => row.person_id === selectedPersonId), [ledger, selectedPersonId]);
  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const person of people) map.set(person.id, 0);
    for (const row of ledger) {
      const delta = ['lent', 'shared_expense'].includes(row.type) ? 1 : -1;
      map.set(row.person_id, (map.get(row.person_id) ?? 0) + delta * Number(row.amount || 0));
    }
    return map;
  }, [ledger, people]);

  const reset = () => {
    setEditingId(null);
    setName('');
    setAvatarColor(AVATAR_COLORS[0]);
  };

  const savePerson = async () => {
    if (!supabase || !name.trim()) return;
    if (editingId) {
      const { data, error } = await supabase.from('people').update({ name, avatar_color: avatarColor }).eq('id', editingId).select('*').single();
      if (!error && data) {
        setPeople(people.map((p) => (p.id === editingId ? data : p)));
        queryClient.invalidateQueries({ queryKey: queryKeys.peopleLedger });
      }
      reset();
      return;
    }
    const { data, error } = await supabase.from('people').insert({ name, avatar_color: avatarColor }).select('*').single();
    if (!error && data) {
      setPeople([data, ...people]);
      setSelectedPersonId(data.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.peopleLedger });
    }
    reset();
  };

  const editPerson = (person: Person) => {
    setEditingId(person.id);
    setName(person.name);
    setAvatarColor(person.avatar_color ?? AVATAR_COLORS[0]);
  };

  const archivePerson = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('people').update({ archived: true }).eq('id', id);
    if (!error) {
      setPeople(people.filter((p) => p.id !== id));
      if (selectedPersonId === id) setSelectedPersonId(people[0]?.id ?? '');
      queryClient.invalidateQueries({ queryKey: queryKeys.peopleLedger });
    }
  };

  const addLedger = async () => {
    if (!supabase || !selectedPersonId || !amount || Number(amount) <= 0) return;
    const { data, error } = await supabase
      .from('people_ledger')
      .insert({ person_id: selectedPersonId, type: entryType, amount, note: note || null })
      .select('*')
      .single();
    if (!error && data) {
      setLedger([data, ...ledger]);
      queryClient.invalidateQueries({ queryKey: queryKeys.peopleLedger });
    }
    setAmount('');
    setNote('');
  };

  const settleUp = async () => {
    const balance = balances.get(selectedPersonId) ?? 0;
    if (!selectedPersonId || balance <= 0) return;
    if (!supabase) return;
    const { data, error } = await supabase
      .from('people_ledger')
      .insert({ person_id: selectedPersonId, type: 'settlement', amount: String(balance), note: 'Auto settlement' })
      .select('*')
      .single();
    if (!error && data) {
      setLedger([data, ...ledger]);
      queryClient.invalidateQueries({ queryKey: queryKeys.peopleLedger });
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <section className="surface-card space-y-4 p-4">
        <div>
          <div className="kicker">Ledger contacts</div>
          <div className="mt-1 font-medium">{editingId ? 'Edit person' : 'Add person'}</div>
        </div>
        <div className="space-y-3">
          <input className="field" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => setAvatarColor(swatch)}
                aria-label={`Use color ${swatch}`}
                className="h-7 w-7 rounded-full transition"
                style={{
                  background: swatch,
                  boxShadow: avatarColor === swatch ? '0 0 0 2px var(--bg-secondary), 0 0 0 4px var(--accent)' : 'none',
                }}
              />
            ))}
          </div>
          <button onClick={savePerson} className="btn-primary w-full">{editingId ? 'Update' : 'Add'} person</button>
          {editingId ? <button onClick={reset} className="btn-ghost w-full text-sm">Cancel edit</button> : null}
        </div>

        <div className="space-y-2 border-t border-[--hairline] pt-4">
          {people.length ? people.map((person) => {
            const balance = balances.get(person.id) ?? 0;
            const active = selectedPersonId === person.id;
            return (
              <div
                key={person.id}
                className={`data-row flex items-center justify-between gap-3 px-3 py-2.5 ${active ? 'border-[--accent-2] bg-[--accent-wash]' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPersonId(person.id)}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedPersonId(person.id)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-8 w-8 shrink-0 rounded-full" style={{ background: person.avatar_color ?? AVATAR_COLORS[0] }} />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{person.name}</div>
                    <div className={`font-mono text-xs ${balance > 0 ? 'text-[--accent]' : balance < 0 ? 'text-[--danger]' : 'text-[--text-muted]'}`}>
                      {formatMoney(Math.abs(balance))} {balance > 0 ? 'owed to you' : balance < 0 ? 'you owe' : 'settled'}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); editPerson(person); }} className="btn-ghost px-2 py-1 text-xs">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); archivePerson(person.id); }} className="btn-ghost px-2 py-1 text-xs">Archive</button>
                </div>
              </div>
            );
          }) : <EmptyState text="No people yet." />}
        </div>
      </section>

      <section className="surface-card space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="kicker">Balance</div>
            <div className="mt-1 font-medium">{selectedPerson ? selectedPerson.name : 'Select a person'}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`font-mono text-lg ${(balances.get(selectedPersonId) ?? 0) > 0 ? 'text-[--accent]' : (balances.get(selectedPersonId) ?? 0) < 0 ? 'text-[--danger]' : ''}`}>
              {formatMoney(balances.get(selectedPersonId) ?? 0)}
            </div>
            <button onClick={settleUp} className="btn-secondary text-sm">Settle up</button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <select className="field" value={selectedPersonId} onChange={(e) => setSelectedPersonId(e.target.value)}>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
          <select className="field" value={entryType} onChange={(e) => setEntryType(e.target.value as PersonLedger['type'])}>
            {ledgerTypes.map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
          </select>
          <input className="field" placeholder="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button onClick={addLedger} className="btn-primary">Add entry</button>
        </div>
        <input className="field" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />

        <div className="space-y-2">
          {selectedLedger.length ? selectedLedger.map((row) => (
            <div key={row.id} className="data-row flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <div className="font-medium capitalize">{row.type.replace('_', ' ')}</div>
                <div className="truncate text-sm text-[--text-secondary]">{row.note ?? 'No note'}</div>
              </div>
              <div className="shrink-0 font-mono text-sm">{formatMoney(Number(row.amount))}</div>
            </div>
          )) : <EmptyState text="No ledger entries for this person yet." />}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[--radius-sm] border border-dashed border-[--hairline] p-6 text-center text-sm text-[--text-muted]">{text}</div>;
}
