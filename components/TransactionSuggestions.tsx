"use client";

import { useEffect, useState } from 'react';
import { generateTransactionSuggestions, TransactionSuggestion } from '../lib/suggestions';
import type { Transaction, Category } from '../lib/types';

export function TransactionSuggestions({ 
  transactions, 
  categories 
}: { 
  transactions: Transaction[]; 
  categories: Category[]; 
}) {
  const [suggestions, setSuggestions] = useState<TransactionSuggestion[]>([]);

  useEffect(() => {
    if (transactions.length > 0 && categories.length > 0) {
      const generated = generateTransactionSuggestions(transactions, categories);
      setSuggestions(generated);
    }
  }, [transactions, categories]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[--border] bg-[--bg-tertiary] p-4 mb-6">
      <h3 className="font-semibold mb-3">Smart Suggestions</h3>
      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div 
            key={suggestion.id} 
            className="p-3 rounded-lg border border-[--border] bg-[--bg-secondary]/50"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{suggestion.title}</div>
                <div className="text-sm text-[--text-muted] mt-1">{suggestion.description}</div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                suggestion.priority === 'high' 
                  ? 'bg-red-500/10 text-red-500' 
                  : suggestion.priority === 'medium'
                  ? 'bg-yellow-500/10 text-yellow-500'
                  : 'bg-green-500/10 text-green-500'
              }`}>
                {suggestion.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}