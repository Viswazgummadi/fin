export type QuickSpendTemplate = {
  id: string;
  label: string;
  note: string;
  amount: number;
  favorite?: boolean;
};

export type QuickSpendHistoryItem = {
  id: string;
  templateId: string;
  timestamp: string;
  amount: number;
  note: string;
};

export type QuickSpendConfig = {
  defaultAccountId: string;
  templates: QuickSpendTemplate[];
};

export const QUICK_SPEND_STORAGE_KEY = 'fin.quick-spend-config.v1';
export const QUICK_SPEND_EVENT = 'fin:quick-spend-config-updated';
export const QUICK_SPEND_HISTORY_KEY = 'fin.quick-spend-history.v1';

export const DEFAULT_QUICK_SPEND_TEMPLATES: QuickSpendTemplate[] = [
  { id: 'metro', label: 'Metro', note: 'Metro - office one way', amount: 40 },
  { id: 'tea', label: 'Tea', note: 'Tea', amount: 20 },
  { id: 'lunch', label: 'Lunch', note: 'Lunch', amount: 150 },
  { id: 'cab', label: 'Cab', note: 'Cab', amount: 300 },
];

export function getDefaultQuickSpendConfig(): QuickSpendConfig {
  return {
    defaultAccountId: '',
    templates: DEFAULT_QUICK_SPEND_TEMPLATES,
  };
}

export function normalizeQuickSpendConfig(config?: Partial<QuickSpendConfig> | null, fallbackAccountId = ''): QuickSpendConfig {
  return {
    defaultAccountId: typeof config?.defaultAccountId === 'string' && config.defaultAccountId ? config.defaultAccountId : fallbackAccountId,
    templates: Array.isArray(config?.templates) && config.templates.length
      ? config.templates.map((template, index) => ({
          id: typeof template?.id === 'string' ? template.id : `template-${index + 1}`,
          label: typeof template?.label === 'string' ? template.label.trim() : `Template ${index + 1}`,
          note: typeof template?.note === 'string' ? template.note.trim() : '',
          amount: Number(template?.amount || 0),
        }))
          .filter((template) => template.label && template.note && template.amount > 0)
      : DEFAULT_QUICK_SPEND_TEMPLATES,
  };
}

export function readQuickSpendConfig(): QuickSpendConfig {
  if (typeof window === 'undefined') return getDefaultQuickSpendConfig();

  try {
    const raw = window.localStorage.getItem(QUICK_SPEND_STORAGE_KEY);
    if (!raw) return getDefaultQuickSpendConfig();
    const parsed = JSON.parse(raw) as Partial<QuickSpendConfig>;
    return normalizeQuickSpendConfig(parsed);
  } catch {
    return getDefaultQuickSpendConfig();
  }
}

export function saveQuickSpendConfig(config: QuickSpendConfig) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(QUICK_SPEND_STORAGE_KEY, JSON.stringify(normalizeQuickSpendConfig(config)));
  window.dispatchEvent(new Event(QUICK_SPEND_EVENT));
}

export function addToQuickSpendHistory(item: Omit<QuickSpendHistoryItem, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return;
  
  const history = readQuickSpendHistory();
  const newItem: QuickSpendHistoryItem = {
    id: crypto.randomUUID(),
    ...item,
    timestamp: new Date().toISOString()
  };
  
  const updated = [newItem, ...history].slice(0, 20); // Keep last 20 items
  window.localStorage.setItem(QUICK_SPEND_HISTORY_KEY, JSON.stringify(updated));
}

export function readQuickSpendHistory(): QuickSpendHistoryItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const raw = window.localStorage.getItem(QUICK_SPEND_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
