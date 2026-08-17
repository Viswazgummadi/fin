"use client";

import { useEffect, useState } from 'react';
import { readQuickSpendHistory } from '../lib/quick-spend';

export function QuickSpendHistory({ onUseHistory }: { onUseHistory: (historyItem: any) => void }) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const historyItems = readQuickSpendHistory();
    setHistory(historyItems.slice(0, 5)); // Show only last 5 items
  }, []);

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <label className="mb-2 block text-xs uppercase tracking-wide text-[--text-muted]">Recent usage</label>
      <div className="space-y-2">
        {history.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onUseHistory(item)}
            className="w-full rounded-[--radius] border border-[--border] bg-[--bg-tertiary] px-3 py-2 text-left hover:bg-[--bg-secondary]/50"
          >
            <div className="flex justify-between">
              <div className="font-medium">{item.note}</div>
              <div className="font-mono">₹{item.amount}</div>
            </div>
            <div className="text-xs text-[--text-muted]">
              {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}