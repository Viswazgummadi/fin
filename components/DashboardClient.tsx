"use client";

import { useState } from 'react';
import Link from 'next/link';
import { DashboardStats } from './DashboardStats';
import { QuickAddModal } from './QuickAddModal';
import { formatMoney } from '../lib/insights';
import type { Account, Transaction } from '../lib/types';

export function DashboardClient({ 
  recent, 
  topCategories, 
  accounts, 
  transactions 
}: { 
  recent: Transaction[]; 
  topCategories: { category: string; amount: number; count: number }[];
  accounts: Account[];
  transactions: Transaction[];
}) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[--text-secondary]">See balances, recent activity, and patterns at a glance.</p>
        </div>
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="hidden rounded-[--radius] bg-[--accent] px-4 py-2 font-semibold text-[--bg-primary] hover:opacity-90 sm:block"
        >
          + Add
        </button>
      </div>

      <DashboardStats accounts={accounts} transactions={transactions} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Recent transactions" action={<Link href="/whathappened" className="text-sm text-[--accent]">View journal</Link>}>
          <div className="space-y-2">
            {recent.length ? recent.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between border-thin bg-[--bg-secondary] rounded-[--radius] px-3 py-2">
                <div>
                  <div className="font-medium text-sm">{txn.note || 'No note'}</div>
                  <div className="text-xs text-[--text-muted]">{new Date(txn.occurred_at).toLocaleDateString('en-IN')}</div>
                </div>
                <div className="font-mono text-sm">{formatMoney(Number(txn.amount))}</div>
              </div>
            )) : <Empty text="No transactions yet." />}
          </div>
        </Section>

        <Section title="Top categories" action={<Link href="/analysis" className="text-sm text-[--accent]">Full analysis</Link>}>
          <div className="space-y-2">
            {topCategories.length ? topCategories.map((row) => (
              <div key={row.category} className="flex items-center justify-between border-thin bg-[--bg-secondary] rounded-[--radius] px-3 py-2">
                <div>
                  <div className="font-medium text-sm">{row.category}</div>
                  <div className="text-xs text-[--text-muted]">{row.count} txns</div>
                </div>
                <div className="font-mono text-sm">{formatMoney(row.amount)}</div>
              </div>
            )) : <Empty text="Add expenses to see categories." />}
          </div>
        </Section>
      </div>

      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-thin bg-[--bg-secondary]/50 rounded-[--radius] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="border border-dashed border-[--border] rounded-[--radius] p-4 text-sm text-[--text-muted] text-center">{text}</div>;
}
