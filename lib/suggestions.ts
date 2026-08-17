import type { Transaction, Category } from './types';

export type TransactionSuggestion = {
  id: string;
  type: 'category' | 'budget' | 'alert';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: () => void;
};

export function generateTransactionSuggestions(transactions: Transaction[], categories: Category[]): TransactionSuggestion[] {
  const suggestions: TransactionSuggestion[] = [];
  
  // Identify frequent spending patterns
  const spendingPatterns = new Map<string, number>();
  transactions.forEach(txn => {
    if (txn.type === 'expense' && txn.category_id) {
      spendingPatterns.set(txn.category_id, (spendingPatterns.get(txn.category_id) || 0) + 1);
    }
  });
  
  // Generate suggestions based on patterns
  spendingPatterns.forEach((count, categoryId) => {
    if (count > 3) { // If category used more than 3 times
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        suggestions.push({
          id: `pattern-${categoryId}`,
          type: 'category',
          title: `Frequent ${category.name} spending`,
          description: `You've spent on ${category.name} ${count} times recently`,
          priority: 'high'
        });
      }
    }
  });
  
  return suggestions;
}