import type { Account, Category, Limit, Tag, Transaction } from './types';
import { calculateAccountBalances } from './finance';
import { formatMoney, getMonthKey, shiftToIST, toDateKey } from './insights';

export type TransactionWithTags = Transaction & { tags: Pick<Tag, 'id' | 'name' | 'color'>[] };

export type PeriodKey = 'this_month' | 'last_month' | 'last_30' | 'last_90' | 'this_year' | 'all';

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_30', label: 'Last 30 days' },
  { key: 'last_90', label: 'Last 90 days' },
  { key: 'this_year', label: 'This year' },
  { key: 'all', label: 'All time' },
];

export type PeriodRange = {
  start: Date | null;
  end: Date;
  prevStart: Date | null;
  prevEnd: Date | null;
  label: string;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Resolves a period key into a concrete date range plus the equivalent prior range for comparison. */
export function getPeriodRange(period: PeriodKey, reference = new Date()): PeriodRange {
  const today = startOfDay(reference);

  switch (period) {
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = today;
      // Compare month-to-date against the SAME number of elapsed days last month, not the
      // whole previous month — otherwise 3 days into a month always looks "down ~90%".
      const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevEnd = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      return { start, end, prevStart, prevEnd, label: 'This month' };
    }
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      const prevStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const prevEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);
      return { start, end, prevStart, prevEnd, label: 'Last month' };
    }
    case 'last_30': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 29);
      return { start, end: today, prevStart, prevEnd, label: 'Last 30 days' };
    }
    case 'last_90': {
      const start = new Date(today);
      start.setDate(start.getDate() - 89);
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 89);
      return { start, end: today, prevStart, prevEnd, label: 'Last 90 days' };
    }
    case 'this_year': {
      const start = new Date(today.getFullYear(), 0, 1);
      // Same logic as this_month: compare year-to-date against the same elapsed days last year.
      const prevStart = new Date(today.getFullYear() - 1, 0, 1);
      const prevEnd = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      return { start, end: today, prevStart, prevEnd, label: 'This year' };
    }
    case 'all':
    default:
      return { start: null, end: today, prevStart: null, prevEnd: null, label: 'All time' };
  }
}

export function inRange(dateIso: string, start: Date | null, end: Date) {
  // `start`/`end` come from getPeriodRange, which derives them from the browser's local
  // clock (not shifted) — comparing against a shiftToIST'd instant here would double-shift
  // and misfile transactions near midnight into the wrong day.
  const d = new Date(dateIso);
  if (start && d < start) return false;
  return d <= new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
}

export function filterInRange<T extends { occurred_at: string; deleted_at?: string | null }>(
  transactions: T[],
  start: Date | null,
  end: Date
) {
  return transactions.filter((t) => !t.deleted_at && inRange(t.occurred_at, start, end));
}

// ---- Net worth ----

export function computeNetWorthSeries(accounts: Account[], transactions: Transaction[], range: { start: Date | null; end: Date }) {
  const sorted = [...transactions].filter((t) => !t.deleted_at).sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  const earliest = sorted[0] ? shiftToIST(sorted[0].occurred_at) : range.end;
  const start = range.start ?? startOfDay(earliest);
  const end = range.end;
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const stepDays = totalDays <= 45 ? 1 : totalDays <= 180 ? 7 : 30;

  const points: { date: string; balance: number }[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + stepDays)) {
    const upTo = transactions.filter((t) => !t.deleted_at && new Date(t.occurred_at) <= cursor);
    const balance = [...calculateAccountBalances(accounts, upTo).values()].reduce((sum, v) => sum + v, 0);
    points.push({ date: toDateKey(cursor), balance });
  }
  const finalBalance = [...calculateAccountBalances(accounts, transactions.filter((t) => !t.deleted_at)).values()].reduce((s, v) => s + v, 0);
  if (points.length && points[points.length - 1].date !== toDateKey(end)) {
    points.push({ date: toDateKey(end), balance: finalBalance });
  }
  return points;
}

// ---- Cashflow ----

export function computeCashflowByMonth(transactions: Transaction[], monthsBack = 6, reference = new Date()) {
  const months: { key: string; label: string; income: number; expense: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(reference.getFullYear(), reference.getMonth() - i, 1);
    months.push({ key: getMonthKey(d), label: d.toLocaleDateString('en-IN', { month: 'short' }), income: 0, expense: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const t of transactions) {
    if (t.deleted_at) continue;
    const key = getMonthKey(t.occurred_at);
    const bucket = byKey.get(key);
    if (!bucket) continue;
    if (t.type === 'income') bucket.income += Number(t.amount || 0);
    if (t.type === 'expense') bucket.expense += Number(t.amount || 0);
  }
  return months;
}

// ---- Categories (with parent rollup) ----

export function categoryAncestry(categories: Category[]) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const rootOf = new Map<string, string>();
  for (const c of categories) {
    let cur: Category = c;
    const seen = new Set<string>();
    while (cur.parent_id && byId.has(cur.parent_id) && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = byId.get(cur.parent_id)!;
    }
    rootOf.set(c.id, cur.id);
  }
  return { byId, rootOf };
}

export type CategoryRow = {
  id: string;
  name: string;
  color: string | null;
  amount: number;
  count: number;
  previousAmount: number;
  children: { id: string; name: string; amount: number; count: number }[];
};

export function computeCategoryBreakdown(
  current: Transaction[],
  previous: Transaction[],
  categories: Category[]
): CategoryRow[] {
  const { byId, rootOf } = categoryAncestry(categories);
  const rows = new Map<string, CategoryRow>();

  const ensureRow = (rootId: string) => {
    const existing = rows.get(rootId);
    if (existing) return existing;
    const cat = byId.get(rootId);
    const row: CategoryRow = { id: rootId, name: cat?.name ?? 'Uncategorized', color: cat?.color ?? null, amount: 0, count: 0, previousAmount: 0, children: [] };
    rows.set(rootId, row);
    return row;
  };

  for (const t of current) {
    if (t.deleted_at || t.type !== 'expense') continue;
    const catId = t.category_id ?? 'uncategorized';
    const rootId = rootOf.get(catId) ?? catId;
    const row = ensureRow(rootId);
    row.amount += Number(t.amount || 0);
    row.count += 1;

    if (catId !== rootId) {
      let child = row.children.find((c) => c.id === catId);
      if (!child) {
        child = { id: catId, name: byId.get(catId)?.name ?? 'Unknown', amount: 0, count: 0 };
        row.children.push(child);
      }
      child.amount += Number(t.amount || 0);
      child.count += 1;
    }
  }

  for (const t of previous) {
    if (t.deleted_at || t.type !== 'expense') continue;
    const catId = t.category_id ?? 'uncategorized';
    const rootId = rootOf.get(catId) ?? catId;
    const row = rows.get(rootId);
    if (row) row.previousAmount += Number(t.amount || 0);
  }

  return [...rows.values()].sort((a, b) => b.amount - a.amount);
}

// ---- Tags ----

export type TagRow = { id: string; name: string; color: string | null; amount: number; count: number; previousAmount: number };

export function computeTagBreakdown(current: TransactionWithTags[], previous: TransactionWithTags[]): TagRow[] {
  const rows = new Map<string, TagRow>();
  for (const t of current) {
    if (t.deleted_at || t.type !== 'expense') continue;
    for (const tag of t.tags ?? []) {
      const row = rows.get(tag.id) ?? { id: tag.id, name: tag.name, color: tag.color, amount: 0, count: 0, previousAmount: 0 };
      row.amount += Number(t.amount || 0);
      row.count += 1;
      rows.set(tag.id, row);
    }
  }
  for (const t of previous) {
    if (t.deleted_at || t.type !== 'expense') continue;
    for (const tag of t.tags ?? []) {
      const row = rows.get(tag.id);
      if (row) row.previousAmount += Number(t.amount || 0);
    }
  }
  return [...rows.values()].sort((a, b) => b.amount - a.amount);
}

// ---- Essential vs non-essential ----

export function computeEssentialSplit(transactions: Transaction[], categories: Category[]) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  let essential = 0;
  let nonEssential = 0;
  let unspecified = 0;
  for (const t of transactions) {
    if (t.deleted_at || t.type !== 'expense') continue;
    const cat = t.category_id ? byId.get(t.category_id) : null;
    const amount = Number(t.amount || 0);
    if (!cat || cat.is_essential === null || cat.is_essential === undefined) unspecified += amount;
    else if (cat.is_essential) essential += amount;
    else nonEssential += amount;
  }
  return { essential, nonEssential, unspecified };
}

// ---- Budgets/limits ----

export function limitPeriodStart(period: Limit['period'], reference = new Date()) {
  const start = new Date(reference);
  if (period === 'weekly') {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
  } else {
    start.setDate(1);
  }
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Spend against a limit's OWN period window (weekly/monthly), independent of any page-level period filter. */
export function spentForLimit(limit: Limit, transactions: TransactionWithTags[]) {
  const start = limitPeriodStart(limit.period);
  return transactions.reduce((sum, txn) => {
    if (txn.deleted_at || txn.type !== 'expense') return sum;
    if (new Date(txn.occurred_at) < start) return sum;
    if (limit.scope === 'category' && txn.category_id !== limit.scope_ref_id) return sum;
    if (limit.scope === 'tag' && !txn.tags.some((tag) => tag.id === limit.scope_ref_id)) return sum;
    return sum + Number(txn.amount || 0);
  }, 0);
}

// ---- Comparisons + narrative insights ----

export function pctDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null; // null = "new", not a finite percent change
  return ((current - previous) / previous) * 100;
}

export function generateNarrativeInsights({
  periodLabel,
  income,
  expense,
  prevIncome,
  prevExpense,
  categoryRows,
  tagRows,
  essentialSplit,
}: {
  periodLabel: string;
  income: number;
  expense: number;
  prevIncome: number;
  prevExpense: number;
  categoryRows: CategoryRow[];
  tagRows: TagRow[];
  essentialSplit: { essential: number; nonEssential: number; unspecified: number };
}): string[] {
  const insights: string[] = [];

  const expenseDelta = pctDelta(expense, prevExpense);
  if (expenseDelta !== null && Math.abs(expenseDelta) >= 5 && prevExpense > 0) {
    insights.push(
      `You've spent ${formatMoney(expense)} ${periodLabel.toLowerCase()} — ${expenseDelta > 0 ? 'up' : 'down'} ${Math.abs(
        Math.round(expenseDelta)
      )}% from the previous period.`
    );
  }

  const savings = income - expense;
  const savingsRate = income > 0 ? (savings / income) * 100 : null;
  if (savingsRate !== null) {
    insights.push(
      savingsRate >= 0
        ? `You saved ${Math.round(savingsRate)}% of income ${periodLabel.toLowerCase()} (${formatMoney(savings)}).`
        : `You spent ${formatMoney(Math.abs(savings))} more than you earned ${periodLabel.toLowerCase()}.`
    );
  }

  const topMover = categoryRows
    .map((row) => ({ row, delta: pctDelta(row.amount, row.previousAmount) }))
    .filter((r) => r.delta !== null && Math.abs(r.delta as number) >= 20 && r.row.amount >= 200)
    .sort((a, b) => Math.abs((b.delta as number) * b.row.amount) - Math.abs((a.delta as number) * a.row.amount))[0];
  if (topMover) {
    const delta = topMover.delta as number;
    insights.push(
      `${topMover.row.name} spend is ${delta > 0 ? 'up' : 'down'} ${Math.abs(Math.round(delta))}% (${formatMoney(topMover.row.amount)}), the biggest mover this period.`
    );
  }

  const topTag = tagRows[0];
  if (topTag && topTag.count >= 3) {
    insights.push(`#${topTag.name} shows up ${topTag.count} times, totaling ${formatMoney(topTag.amount)}.`);
  }

  const essentialTotal = essentialSplit.essential + essentialSplit.nonEssential;
  if (essentialTotal > 0 && essentialSplit.nonEssential / essentialTotal >= 0.4) {
    insights.push(
      `${Math.round((essentialSplit.nonEssential / essentialTotal) * 100)}% of tagged spend is non-essential — mostly discretionary.`
    );
  }

  return insights;
}

// ---- Anomalies ----

export type AnomalyTxn = { transaction: Transaction; categoryName: string; z: number };

export function detectAnomalies(current: Transaction[], history: Transaction[], categories: Category[], limit = 3): AnomalyTxn[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const historyByCategory = new Map<string, number[]>();
  for (const t of history) {
    if (t.deleted_at || t.type !== 'expense' || !t.category_id) continue;
    const arr = historyByCategory.get(t.category_id) ?? [];
    arr.push(Number(t.amount || 0));
    historyByCategory.set(t.category_id, arr);
  }

  const results: AnomalyTxn[] = [];
  for (const t of current) {
    if (t.deleted_at || t.type !== 'expense' || !t.category_id) continue;
    const history = historyByCategory.get(t.category_id);
    if (!history || history.length < 4) continue;
    const mean = history.reduce((s, v) => s + v, 0) / history.length;
    const variance = history.reduce((s, v) => s + (v - mean) ** 2, 0) / history.length;
    const stddev = Math.sqrt(variance);
    if (stddev === 0) continue;
    const z = (Number(t.amount) - mean) / stddev;
    if (z >= 2) {
      results.push({ transaction: t, categoryName: byId.get(t.category_id)?.name ?? 'Unknown', z });
    }
  }
  return results.sort((a, b) => b.z - a.z).slice(0, limit);
}
