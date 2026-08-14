"use client";

import { useMemo, useState } from 'react';
import type { Person, PersonLedger } from '../lib/types';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { formatMoney } from '../lib/insights';

const ledgerTypes = ['lent', 'borrowed', 'shared_expense', 'reimbursement', 'settlement'] as const;

export function PeopleClient({ initialPeople, initialLedger }: { initialPeople: Person[]; initialLedger: PersonLedger[] }) {
  const supabase = createSupabaseBrowserClient();
  const [people, setPeople] = useState(initialPeople);
  const [ledger, setLedger] = useState(initialLedger);
  const [name, setName] = useState('');
  const [avatarColor, setAvatarColor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState(initialPeople[0]?.id ?? '');
  const [entryType, setEntryType] = useState<PersonLedger['type']>('lent');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

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
    setAvatarColor('#6366f1');
  };

  const savePerson = async () => {
    if (!supabase || !name.trim()) return;
    if (editingId) {
      const { data, error } = await supabase.from('people').update({ name, avatar_color: avatarColor }).eq('id', editingId).select('*').single();
      if (!error && data) setPeople(people.map((p) => (p.id === editingId ? data : p)));
      reset();
      return;
    }
    const { data, error } = await supabase.from('people').insert({ name, avatar_color: avatarColor }).select('*').single();
    if (!error && data) {
      setPeople([data, ...people]);
      setSelectedPersonId(data.id);
    }
    reset();
  };

  const editPerson = (person: Person) => {
    setEditingId(person.id);
    setName(person.name);
    setAvatarColor(person.avatar_color ?? '#6366f1');
  };

  const archivePerson = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('people').update({ archived: true }).eq('id', id);
    if (!error) {
      setPeople(people.filter((p) => p.id !== id));
      if (selectedPersonId === id) setSelectedPersonId(people[0]?.id ?? '');
    }
  };

  const addLedger = async () => {
    if (!supabase || !selectedPersonId || !amount || Number(amount) <= 0) return;
    const { data, error } = await supabase
      .from('people_ledger')
      .insert({ person_id: selectedPersonId, type: entryType, amount, note: note || null })
      .select('*')
      .single();
    if (!error && data) setLedger([data, ...ledger]);
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
    if (!error && data) setLedger([data, ...ledger]);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="space-y-4 rounded-xl border border-border bg-bg-secondary p-4">
        <div className="space-y-3">
          <div className="font-semibold">People</div>
          <input className="min-h-11 w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="min-h-11 w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="# color" value={avatarColor} onChange={(e) => setAvatarColor(e.target.value)} />
          <button onClick={savePerson} className="min-h-11 w-full rounded-lg bg-accent px-4 py-2 font-medium text-black">{editingId ? 'Update' : 'Add'} person</button>
          {editingId ? <button onClick={reset} className="text-sm text-text-secondary">Cancel edit</button> : null}
        </div>
        <div className="space-y-2">
          {people.length ? people.map((person) => (
            <div
              key={person.id}
              className={`rounded-xl border p-3 text-left transition ${selectedPersonId === person.id ? 'border-accent bg-accent/10' : 'border-border bg-bg-primary/40'}`}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPersonId(person.id)}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedPersonId(person.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{person.name}</div>
                  <div className="text-sm text-text-secondary">{formatMoney(balances.get(person.id) ?? 0)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: person.avatar_color ?? '#6366f1' }} />
                  <button onClick={(e) => { e.stopPropagation(); editPerson(person); }} className="text-xs text-text-secondary">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); archivePerson(person.id); }} className="text-xs text-text-secondary">Archive</button>
                </div>
              </div>
            </div>
          )) : <div className="rounded-lg border border-dashed border-border p-4 text-sm text-text-secondary">No people yet.</div>}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-bg-secondary p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Ledger</div>
            <div className="text-sm text-text-secondary">Record lend/borrow/shared expenses and settlements.</div>
          </div>
          <div className="flex gap-2">
            <div className="font-mono text-lg">{formatMoney(balances.get(selectedPersonId) ?? 0)}</div>
            <button onClick={settleUp} className="rounded-lg border border-border px-3 py-2 text-sm min-h-11">Settle up</button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <select className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={selectedPersonId} onChange={(e) => setSelectedPersonId(e.target.value)}>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
          <select className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" value={entryType} onChange={(e) => setEntryType(e.target.value as PersonLedger['type'])}>
            {ledgerTypes.map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
          </select>
          <input className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button onClick={addLedger} className="min-h-11 rounded-lg bg-accent px-4 py-2 font-medium text-black">Add ledger item</button>
        </div>
        <input className="min-h-11 w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />

        <div className="space-y-2">
          {selectedLedger.length ? selectedLedger.map((row) => (
            <div key={row.id} className="rounded-lg border border-border bg-bg-primary/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{row.type.replace('_', ' ')}</div>
                  <div className="text-sm text-text-secondary">{row.note ?? 'No note'}</div>
                </div>
                <div className="font-mono">{formatMoney(Number(row.amount))}</div>
              </div>
            </div>
          )) : <div className="rounded-lg border border-dashed border-border p-4 text-sm text-text-secondary">No ledger entries for this person yet.</div>}
        </div>
      </section>
    </div>
  );
}
