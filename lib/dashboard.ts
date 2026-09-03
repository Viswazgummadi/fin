export type DashboardWidget = {
  id: string;
  type: 'balance' | 'net-worth' | 'spending-trend' | 'recent-transactions' | 'top-categories' | 'budget-summary' | 'upcoming-bills';
  position: number;
  visible: boolean;
};

const SUPPORTED_WIDGET_TYPES: DashboardWidget['type'][] = [
  'balance',
  'net-worth',
  'spending-trend',
  'recent-transactions',
  'top-categories',
  'budget-summary',
  'upcoming-bills',
];

export const WIDGET_LABELS: Record<DashboardWidget['type'], string> = {
  balance: 'Balance & monthly stats',
  'net-worth': 'Net worth trend',
  'spending-trend': 'Spending trend',
  'recent-transactions': 'Recent transactions',
  'top-categories': 'Top categories',
  'budget-summary': 'Budget summary',
  'upcoming-bills': 'Upcoming bills',
};

export const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'balance', type: 'balance', position: 0, visible: true },
  { id: 'net-worth', type: 'net-worth', position: 1, visible: true },
  { id: 'spending-trend', type: 'spending-trend', position: 2, visible: true },
  { id: 'recent-transactions', type: 'recent-transactions', position: 3, visible: true },
  { id: 'top-categories', type: 'top-categories', position: 4, visible: true },
  { id: 'budget-summary', type: 'budget-summary', position: 5, visible: true },
  { id: 'upcoming-bills', type: 'upcoming-bills', position: 6, visible: true },
];

function sortWidgets(widgets: DashboardWidget[]) {
  return [...widgets].sort((a, b) => a.position - b.position);
}

export function normalizeDashboardWidgets(widgets?: DashboardWidget[] | null): DashboardWidget[] {
  const source = Array.isArray(widgets) ? widgets : DEFAULT_WIDGETS;
  const byType = new Map(source.filter((widget) => SUPPORTED_WIDGET_TYPES.includes(widget.type)).map((widget) => [widget.type, widget]));

  const merged = DEFAULT_WIDGETS.map((fallback, index) => {
    const current = byType.get(fallback.type);
    return {
      ...fallback,
      id: current?.id ?? fallback.id,
      position: typeof current?.position === 'number' ? current.position : index,
      visible: typeof current?.visible === 'boolean' ? current.visible : fallback.visible,
    };
  });

  // Sort by position so a saved reorder actually sticks across reloads — previously this
  // always returned DEFAULT_WIDGETS' fixed array order, silently discarding any reordering
  // the user had done (moveWidget updated `.position` correctly, but nothing ever read it
  // back into array order on the next normalize pass).
  return sortWidgets(merged);
}

export function getUserDashboardWidgets(): DashboardWidget[] {
  if (typeof window === 'undefined') return DEFAULT_WIDGETS;

  try {
    const raw = window.localStorage.getItem('fin.dashboard-widgets.v1');
    if (!raw) return DEFAULT_WIDGETS;
    return normalizeDashboardWidgets(JSON.parse(raw));
  } catch {
    return DEFAULT_WIDGETS;
  }
}

export function saveUserDashboardWidgets(widgets: DashboardWidget[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('fin.dashboard-widgets.v1', JSON.stringify(sortWidgets(normalizeDashboardWidgets(widgets))));
}
