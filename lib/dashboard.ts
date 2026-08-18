export type DashboardWidget = {
  id: string;
  type: 'balance' | 'spending-trend' | 'recent-transactions' | 'budget-summary' | 'top-categories';
  position: number;
  visible: boolean;
};

const SUPPORTED_WIDGET_TYPES: DashboardWidget['type'][] = ['balance', 'spending-trend', 'recent-transactions', 'budget-summary', 'top-categories'];

export const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'balance', type: 'balance', position: 0, visible: true },
  { id: 'spending-trend', type: 'spending-trend', position: 1, visible: true },
  { id: 'recent-transactions', type: 'recent-transactions', position: 2, visible: true },
  { id: 'budget-summary', type: 'budget-summary', position: 3, visible: true },
  { id: 'top-categories', type: 'top-categories', position: 4, visible: true },
];

function sortWidgets(widgets: DashboardWidget[]) {
  return [...widgets].sort((a, b) => a.position - b.position);
}

export function normalizeDashboardWidgets(widgets?: DashboardWidget[] | null): DashboardWidget[] {
  const source = Array.isArray(widgets) ? widgets : DEFAULT_WIDGETS;
  const byType = new Map(source.filter((widget) => SUPPORTED_WIDGET_TYPES.includes(widget.type)).map((widget) => [widget.type, widget]));

  return DEFAULT_WIDGETS.map((fallback, index) => {
    const current = byType.get(fallback.type);
    return {
      ...fallback,
      id: current?.id ?? fallback.id,
      position: typeof current?.position === 'number' ? current.position : index,
      visible: typeof current?.visible === 'boolean' ? current.visible : fallback.visible,
    };
  });
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